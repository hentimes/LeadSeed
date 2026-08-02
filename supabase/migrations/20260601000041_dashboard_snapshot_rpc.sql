create or replace function public.get_my_dashboard_snapshot(
  p_compare_period text default 'yesterday'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz := date_trunc('day', now());
  v_tomorrow_start timestamptz := v_today_start + interval '1 day';
  v_compare_start timestamptz;
  v_compare_end timestamptz;
  v_status_counts jsonb := '{}'::jsonb;
  v_monthly_counts jsonb := '[]'::jsonb;
begin
  v_compare_start := case p_compare_period
    when 'lastWeek' then v_today_start - interval '7 days'
    when 'lastMonth' then v_today_start - interval '30 days'
    when 'lastYear' then v_today_start - interval '365 days'
    else v_today_start - interval '1 day'
  end;
  v_compare_end := v_compare_start + interval '1 day';

  select coalesce(
    jsonb_object_agg(status_key, status_count),
    '{}'::jsonb
  )
  into v_status_counts
  from (
    select coalesce(l.status, 'nuevo') as status_key, count(*)::int as status_count
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
    group by coalesce(l.status, 'nuevo')
  ) grouped_statuses;

  with months as (
    select
      generate_series(5, 0, -1) as offset_month
  ),
  labeled_months as (
    select
      offset_month,
      date_trunc('month', now()) - make_interval(months => offset_month) as month_start
    from months
  ),
  month_counts as (
    select
      lm.month_start,
      count(l.id)::int as lead_count
    from labeled_months lm
    left join public.leads l
      on l.user_id = auth.uid()
     and l.deleted_at is null
     and l.created_at >= lm.month_start
     and l.created_at < (lm.month_start + interval '1 month')
    group by lm.month_start
    order by lm.month_start asc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', upper(to_char(month_start, 'Mon')),
        'count', lead_count
      )
      order by month_start
    ),
    '[]'::jsonb
  )
  into v_monthly_counts
  from month_counts;

  return jsonb_build_object(
    'leadSummary',
    jsonb_build_object(
      'total', (
        select count(*)::int
        from public.leads l
        where l.user_id = auth.uid()
          and l.deleted_at is null
      ),
      'contacted', (
        select count(*)::int
        from public.leads l
        where l.user_id = auth.uid()
          and l.deleted_at is null
          and coalesce(l.status, 'nuevo') <> 'nuevo'
      ),
      'converted', (
        select count(*)::int
        from public.leads l
        where l.user_id = auth.uid()
          and l.deleted_at is null
          and l.status = 'convertido'
      ),
      'forgotten', (
        select count(*)::int
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
      'statusCounts', v_status_counts,
      'monthlyCounts', v_monthly_counts
    ),
    'sendSummary',
    jsonb_build_object(
      'today', jsonb_build_object(
        'whatsapp', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'whatsapp'
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        ),
        'email', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'email'
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        ),
        'call', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'call'
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        ),
        'total', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        )
      ),
      'compare', jsonb_build_object(
        'whatsapp', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'whatsapp'
            and sl.sent_at >= v_compare_start
            and sl.sent_at < v_compare_end
        ),
        'email', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'email'
            and sl.sent_at >= v_compare_start
            and sl.sent_at < v_compare_end
        ),
        'call', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'call'
            and sl.sent_at >= v_compare_start
            and sl.sent_at < v_compare_end
        ),
        'total', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.sent_at >= v_compare_start
            and sl.sent_at < v_compare_end
        )
      )
    ),
    'taskSummary',
    jsonb_build_object(
      'pending', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
          and t.status = 'pendiente'
      ),
      'overdue', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
          and t.status = 'pendiente'
          and t.due_date is not null
          and t.due_date < v_today_start
      ),
      'today', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
          and t.status = 'pendiente'
          and t.due_date is not null
          and t.due_date >= v_today_start
          and t.due_date < v_tomorrow_start
      ),
      'completedToday', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
          and t.status = 'completada'
          and t.created_at >= v_today_start
          and t.created_at < v_tomorrow_start
      ),
      'completedTotal', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
          and t.status = 'completada'
      ),
      'total', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
      )
    )
  );
end;
$$;

revoke all on function public.get_my_dashboard_snapshot(text) from public;
grant execute on function public.get_my_dashboard_snapshot(text) to authenticated;

comment on function public.get_my_dashboard_snapshot(text) is
  'Snapshot agregado del dashboard propio para evitar cargar colecciones completas de leads, send_logs y tasks.';
