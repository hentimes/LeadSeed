-- 061 - Desempate estable en el orden de leads
--
-- Sintoma reportado: al abrir el detalle de un lead, el lead se movia de lugar
-- en la lista, y ademas aparecia un aviso de "nuevo lead" que no correspondia.
--
-- Causa: el orden no tenia clave unica de desempate. En esta base 1962 de 1974
-- leads comparten created_at, y un solo grupo tiene 1331 filas con el mismo
-- timestamp. Postgres no garantiza ningun orden dentro de un empate, y el que
-- devuelve depende de la posicion fisica de la fila. Abrir un lead lo marca
-- como leido, eso es un UPDATE, el UPDATE reubica la fila, y el bloque
-- empatado sale rebarajado: el lead cambia de lugar y otro lead entra a la
-- pagina desde la siguiente.
--
-- Se agrega id como ultima clave en el RPC. El lado de PostgREST se arregla en
-- leadsRepository.ts con el mismo criterio.

create or replace function public.list_my_forgotten_leads(
  p_search text default null,
  p_list_id bigint default null,
  p_status text default null,
  p_date_filter text default null,
  p_sort_field text default 'createdAt',
  p_sort_direction text default 'desc',
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  id uuid,
  user_id uuid,
  name text,
  phone text,
  email text,
  company text,
  rut text,
  status text,
  score integer,
  lista_ids integer[],
  notes text,
  scheduled_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  assigned_at timestamptz,
  first_contacted_at timestamptz,
  closed_at timestamptz,
  estimated_value numeric,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 50), 1), 200);
  v_offset integer := (v_page - 1) * v_page_size;
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_field text := coalesce(nullif(p_sort_field, ''), 'createdAt');
  v_asc boolean := coalesce(nullif(p_sort_direction, ''), 'desc') = 'asc';
begin
  return query
  with forgotten as (
    select l.*
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
      and l.created_at < (now() - interval '7 days')
      and not exists (
        select 1
        from public.send_logs sl
        where sl.user_id = l.user_id
          and sl.lead_id = l.id
      )
  ),
  filtered as (
    select f.*
    from forgotten f
    where (p_list_id is null or coalesce(f.lista_ids, '{}'::integer[]) @> array[p_list_id::integer])
      and (p_status is null or f.status = p_status)
      and (
        p_date_filter is null
        or p_date_filter = ''
        or (
          p_date_filter = '7d'
          and f.created_at >= (date_trunc('day', now()) - interval '7 days')
        )
        or (
          p_date_filter = '30d'
          and f.created_at >= (date_trunc('day', now()) - interval '30 days')
        )
        or (
          p_date_filter = 'thisMonth'
          and f.created_at >= date_trunc('month', now())
        )
      )
      and (
        v_search is null
        or f.name ilike ('%' || v_search || '%')
        or coalesce(f.email, '') ilike ('%' || v_search || '%')
        or coalesce(f.phone, '') ilike ('%' || v_search || '%')
        or coalesce(f.company, '') ilike ('%' || v_search || '%')
        or coalesce(f.rut, '') ilike ('%' || v_search || '%')
      )
  )
  select
    filtered.id,
    filtered.user_id,
    filtered.name,
    filtered.phone,
    filtered.email,
    filtered.company,
    filtered.rut,
    filtered.status,
    filtered.score,
    filtered.lista_ids,
    filtered.notes,
    filtered.scheduled_at,
    filtered.utm_source,
    filtered.utm_medium,
    filtered.utm_campaign,
    filtered.utm_term,
    filtered.utm_content,
    filtered.assigned_at,
    filtered.first_contacted_at,
    filtered.closed_at,
    filtered.estimated_value,
    filtered.metadata,
    filtered.created_at,
    filtered.updated_at,
    filtered.deleted_at
  from filtered
  -- Una clave de texto y otra numerica, elegidas segun el campo pedido, en vez
  -- de una rama por columna. Cada clave necesita su par asc/desc porque la
  -- direccion no se puede parametrizar dentro de un order by.
  order by
    (case when v_asc then
      case v_field
        when 'name' then filtered.name
        when 'rut' then filtered.rut
        when 'company' then filtered.company
        when 'healthSystem' then filtered.metadata->'raw_payload'->>'sistema_actual'
        when 'isapre' then filtered.metadata->'raw_payload'->>'isapre_especifica'
        when 'comuna' then filtered.metadata->'raw_payload'->>'comuna'
      end
     end) asc nulls last,
    (case when not v_asc then
      case v_field
        when 'name' then filtered.name
        when 'rut' then filtered.rut
        when 'company' then filtered.company
        when 'healthSystem' then filtered.metadata->'raw_payload'->>'sistema_actual'
        when 'isapre' then filtered.metadata->'raw_payload'->>'isapre_especifica'
        when 'comuna' then filtered.metadata->'raw_payload'->>'comuna'
      end
     end) desc nulls last,
    (case when v_asc then
      case v_field
        when 'score' then filtered.score::numeric
        when 'income' then public.parse_income_rank(filtered.metadata->'raw_payload'->>'rango_renta')
        when 'lists' then coalesce(array_length(filtered.lista_ids, 1), 0)::numeric
      end
     end) asc nulls last,
    (case when not v_asc then
      case v_field
        when 'score' then filtered.score::numeric
        when 'income' then public.parse_income_rank(filtered.metadata->'raw_payload'->>'rango_renta')
        when 'lists' then coalesce(array_length(filtered.lista_ids, 1), 0)::numeric
      end
     end) desc nulls last,
    (case when v_field = 'createdAt' and v_asc then filtered.created_at end) asc,
    (case when v_field = 'createdAt' and not v_asc then filtered.created_at end) desc,
    filtered.created_at desc,
    -- Desempate final obligatorio. 1962 de 1974 leads comparten created_at (un
    -- grupo tiene 1331 filas con el mismo timestamp), asi que sin una clave
    -- unica el bloque empatado sale en orden indefinido y se rebaraja cada vez
    -- que se actualiza una fila: los leads saltaban de posicion y de pagina.
    filtered.id
  offset v_offset
  limit v_page_size;
end;
$$;
