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
  order by
    case when p_sort_field = 'name' and p_sort_direction = 'asc' then filtered.name end asc,
    case when p_sort_field = 'name' and p_sort_direction = 'desc' then filtered.name end desc,
    case when p_sort_field = 'rut' and p_sort_direction = 'asc' then filtered.rut end asc nulls last,
    case when p_sort_field = 'rut' and p_sort_direction = 'desc' then filtered.rut end desc nulls last,
    case when (p_sort_field = 'createdAt' or p_sort_field is null or p_sort_field = '') and p_sort_direction = 'asc' then filtered.created_at end asc,
    case when (p_sort_field = 'createdAt' or p_sort_field is null or p_sort_field = '') and (p_sort_direction = 'desc' or p_sort_direction is null or p_sort_direction = '') then filtered.created_at end desc,
    filtered.created_at desc
  offset v_offset
  limit v_page_size;
end;
$$;

create or replace function public.count_my_forgotten_leads(
  p_search text default null,
  p_list_id bigint default null,
  p_status text default null,
  p_date_filter text default null
)
returns table (
  filtered_count bigint,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
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
    (select count(*) from filtered) as filtered_count,
    (select count(*) from forgotten) as total_count;
end;
$$;

revoke all on function public.list_my_forgotten_leads(text, bigint, text, text, text, text, integer, integer) from public;
grant execute on function public.list_my_forgotten_leads(text, bigint, text, text, text, text, integer, integer) to authenticated;

revoke all on function public.count_my_forgotten_leads(text, bigint, text, text) from public;
grant execute on function public.count_my_forgotten_leads(text, bigint, text, text) to authenticated;

comment on function public.list_my_forgotten_leads(text, bigint, text, text, text, text, integer, integer) is
  'Lista paginada de leads propios con mas de 7 dias sin ningun send_log del owner.';

comment on function public.count_my_forgotten_leads(text, bigint, text, text) is
  'Conteos total y filtrado para la vista olvidados del inbox.';
