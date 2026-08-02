-- 057 - Orden correcto de la columna Renta y del resto de columnas ordenables
--
-- Problema 1: "Renta" se guarda como texto libre (metadata->raw_payload->>rango_renta),
-- asi que el orden era lexicografico: "$500.000 - $1.000.000" quedaba antes que
-- "Mas de $2.000.000" por el signo peso, y "Menos de..." iba al final por la M.
--
-- Problema 2: list_my_forgotten_leads solo ordenaba por name/rut/createdAt.
-- Pedir orden por empresa, score, listas, sistema, isapre, renta o comuna caia
-- en silencio a created_at desc, sin error visible.
--
-- No se hardcodean los tramos: el monto se deriva del propio texto, para que
-- siga funcionando si cambia la redaccion en el formulario de origen.
--
-- La definicion de "olvidado" (7 dias sin envios), los filtros y el tipo de
-- retorno se conservan identicos a la migracion 039. Solo cambia el order by.

-- ---------------------------------------------------------------------------
-- Monto ordenable a partir del texto de renta
-- ---------------------------------------------------------------------------
create or replace function public.parse_income_rank(p_text text)
returns numeric
language sql
immutable
parallel safe
as $fn$
  with base as (
    select
      lower(coalesce(p_text, '')) as txt,
      nullif(
        regexp_replace(coalesce(substring(p_text from '[0-9][0-9.,]*'), ''), '[.,]', '', 'g'),
        ''
      )::numeric as amount
  )
  select case
    when amount is null then null
    -- "Menos de $500.000" comparte monto con "$500.000 - $1.000.000".
    -- El desempate de +-1 los ordena bien sin enumerar los tramos.
    -- Las variantes con y sin tilde se listan a proposito: unaccent() no esta
    -- garantizada en la instancia, y lower() no quita la tilde: 'Más de...'
    -- queda como 'más de...', que no matchea el patron 'mas%'.
    when txt like 'menos%' or txt like 'hasta%' then amount - 1
    when txt like 'mas%' or txt like 'más%' or txt like 'sobre%' or txt like 'desde%' then amount + 1
    else amount
  end
  from base;
$fn$;

comment on function public.parse_income_rank(text) is
  'Convierte un tramo de renta escrito en texto a un numero ordenable. Immutable para poder indexarse.';

-- Campo calculado que PostgREST expone: habilita .order("income_rank").
create or replace function public.income_rank(public.leads)
returns numeric
language sql
immutable
parallel safe
as $fn$
  select public.parse_income_rank($1.metadata->'raw_payload'->>'rango_renta');
$fn$;

comment on function public.income_rank(public.leads) is
  'Campo calculado para ordenar leads por renta numericamente en vez de alfabeticamente.';

create index if not exists leads_income_rank_idx
  on public.leads (public.parse_income_rank(metadata->'raw_payload'->>'rango_renta'));

-- ---------------------------------------------------------------------------
-- list_my_forgotten_leads: soportar todas las columnas ordenables
-- ---------------------------------------------------------------------------
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
    filtered.created_at desc
  offset v_offset
  limit v_page_size;
end;
$$;
