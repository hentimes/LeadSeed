-- forgotten_leads_trigram_search
--
-- Tipo:           query permanente (extension + indice + reemplazo de funcion)
-- Objeto:         public.leads, public.list_my_forgotten_leads
-- Clase:          optimizacion de lectura
-- Persistencia:   permanente
-- Reversibilidad: total (ver bloque final)
--
-- PROPOSITO
--
-- `list_my_forgotten_leads` busca con `ilike '%token%'`. Un comodin al principio
-- del patron inutiliza cualquier indice B-tree, asi que hoy cada busqueda
-- recorre entera la lista de olvidados del usuario. En la cuenta que motivo esta
-- migracion son 1927 de 1930 leads, y esa consulta se ejecuta en cada carga de
-- la bandeja de olvidados.
--
-- `pg_trgm` es la respuesta estandar de Postgres a ese patron: descompone el
-- texto en trigramas y un indice GIN sobre ellos si puede servir un `ilike` con
-- comodin inicial.
--
-- POR QUE ADEMAS HAY QUE TOCAR LA FUNCION
--
-- Para que el planificador use un indice de expresion, la expresion indexada
-- tiene que coincidir **exactamente** con la del `where`. La funcion usa hoy
-- `concat_ws(' ', ...)`, y `concat_ws` esta declarada STABLE, no IMMUTABLE, asi
-- que Postgres no admite indexarla. Se sustituye por concatenacion con `||` y
-- `coalesce`, que si es inmutable, y el indice usa esa misma forma.
--
-- El resultado de la busqueda no cambia. La unica diferencia entre las dos
-- expresiones es que `concat_ws` omite los nulos y esta deja un espacio de mas
-- en su lugar. Como los tokens se parten por espacios antes de comparar, ningun
-- token puede contener uno, y por lo tanto ninguno puede verse afectado por que
-- haya uno o dos.
--
-- DEPENDENCIAS
--
-- `public.leads`. La funcion conserva firma, tipo de retorno, criterio de
-- olvidado, filtros, orden y paginacion: solo cambia como se escribe el filtro
-- de texto.
--
-- IMPACTO
--
-- Lecturas: la busqueda dentro de olvidados deja de escalar con el numero de
-- leads del usuario. Escrituras: un indice GIN mas sobre `leads`, que encarece
-- algo el alta y la edicion. Es el intercambio habitual y aqui compensa, porque
-- esta tabla se lee mucho mas de lo que se escribe.
--
-- El indice es parcial (`where deleted_at is null`) porque la funcion nunca
-- mira leads borrados.

create extension if not exists pg_trgm;

create index if not exists leads_busqueda_trgm_idx
  on public.leads
  using gin (
    (
      coalesce(name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(company, '') || ' ' ||
      coalesce(rut, '')
    ) gin_trgm_ops
  )
  where deleted_at is null;

-- Se reemplaza solo el bloque del filtro de texto. Todo lo demas es identico a
-- 063_word_search.sql.
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
        -- Cada palabra buscada tiene que aparecer en algun dato del lead, pero
        -- no necesariamente en el mismo campo ni en ese orden. Antes se
        -- comparaba la frase completa contra cada campo, asi que "Henry Farias"
        -- no encontraba a "Henry Jose Farias Pacheco".
        -- La expresion se escribe con `||` y `coalesce`, y no con `concat_ws`,
        -- para que coincida con `leads_busqueda_trgm_idx` y el planificador
        -- pueda usarlo. Ver la cabecera de esta migracion.
        or (
          select bool_and(
            (
              coalesce(f.name, '') || ' ' ||
              coalesce(f.email, '') || ' ' ||
              coalesce(f.phone, '') || ' ' ||
              coalesce(f.company, '') || ' ' ||
              coalesce(f.rut, '')
            ) ilike ('%' || token || '%')
          )
          from unnest(regexp_split_to_array(v_search, '\s+')) as token
          where token <> ''
        )
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

-- REVERSION
--
--   Volver a aplicar 063_word_search.sql, que restituye la version con
--   concat_ws, y despues:
--     drop index if exists public.leads_busqueda_trgm_idx;
--
--   La extension pg_trgm puede quedarse: no molesta y otras consultas podrian
--   aprovecharla.
