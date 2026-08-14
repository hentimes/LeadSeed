-- dashboard_snapshot_derived_metrics
--
-- Tipo:           query permanente (reemplazo de funcion)
-- Objeto:         public.get_my_dashboard_snapshot
-- Clase:          agregados nuevos sobre datos que ya existian
-- Persistencia:   permanente
-- Reversibilidad: total (volver a aplicar 101)
--
-- PROPOSITO
--
-- Cerrar los tres graficos del panel que seguian mostrando constantes escritas
-- en el codigo. A diferencia del motivo de descarte, **estos no necesitaban
-- capturar nada**: el dato ya estaba en `leads` y nadie lo estaba agregando.
--
--   originQuality      volumen, conversion y ciclo por origen  -> QualityMatrix
--   monthlyByOrigin    adquisicion mensual por origen          -> DynamicAcquisitionChart
--   stageDurations     tiempo entre etapas                     -> TimeInStageChart
--
-- DOS DECISIONES QUE NO SON OBVIAS
--
-- El **ciclo de venta** promedia solo los leads convertidos. Incluir los que
-- siguen abiertos daria un numero que baja cuando entran leads nuevos, que es
-- lo contrario de lo que la metrica quiere decir.
--
-- Los **tiempos por etapa son dos, no cuatro**. `leads` guarda
-- `first_contacted_at` y `closed_at`, pero no cuando el lead paso a
-- "interesado". El grafico mostraba cuatro etapas; ahora muestra las dos que
-- existen. Para las otras dos haria falta registrar cada cambio de estado, que
-- es un frente propio.
--
-- Los promedios pueden venir nulos si todavia no hay ningun caso, y el frontend
-- debe distinguir "aun no hay datos" de "cero dias".
--
-- METODO
--
-- Derivada del texto de 101 con tres inserciones verificadas.

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
  v_origin_counts jsonb := '{}'::jsonb;
  v_channel_counts jsonb := '{}'::jsonb;
  v_loss_reasons jsonb := '[]'::jsonb;
  v_origin_quality jsonb := '[]'::jsonb;
  v_monthly_by_origin jsonb := '[]'::jsonb;
  v_stage_durations jsonb := '{}'::jsonb;
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

  -- Como entro el lead al CRM: manual, importado o formulario web. Es lo que
  -- el panel llamaba "fuente", y hasta el 2026-08-14 lo mostraba con
  -- porcentajes fijos escritos en el codigo en vez de contarlo.
  select coalesce(jsonb_object_agg(origin_key, origin_count), '{}'::jsonb)
  into v_origin_counts
  from (
    select
      coalesce(nullif(trim(l.metadata ->> 'origin'), ''), 'manual') as origin_key,
      count(*)::int as origin_count
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
    group by 1
  ) grouped_origins;

  -- De que formulario publico vino, cuando vino de uno. Es un corte distinto
  -- del anterior, no un subconjunto de etiquetas: un lead manual no tiene
  -- canal, y por eso solo se cuentan los que lo declaran.
  select coalesce(jsonb_object_agg(channel_key, channel_count), '{}'::jsonb)
  into v_channel_counts
  from (
    select
      l.metadata ->> 'source_channel' as channel_key,
      count(*)::int as channel_count
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
      and nullif(trim(l.metadata ->> 'source_channel'), '') is not null
    group by 1
  ) grouped_channels;

  -- Motivos de descarte, de mas a menos frecuente.
  --
  -- Los descartados sin motivo se cuentan aparte, no se reparten entre las
  -- categorias: nadie les pregunto, y repartirlos seria inventar el dato que
  -- este grafico existia para mostrar.
  select coalesce(
    jsonb_agg(jsonb_build_object('name', reason_key, 'value', reason_count) order by reason_count desc),
    '[]'::jsonb
  )
  into v_loss_reasons
  from (
    select
      coalesce(nullif(trim(l.discard_reason), ''), 'Sin motivo') as reason_key,
      count(*)::int as reason_count
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
      and l.status = 'descartado'
    group by 1
  ) grouped_reasons;

  -- Calidad por origen: volumen, conversion y cuanto tarda en cerrarse.
  --
  -- El ciclo solo cuenta los convertidos: promediar tambien los abiertos daria
  -- un numero que baja cuando entran leads nuevos, que es justo al reves de lo
  -- que la metrica quiere decir.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'origin', origin_key,
        'leads', total_leads,
        'converted', converted_leads,
        'avgCycleDays', cycle_days
      )
      order by total_leads desc
    ),
    '[]'::jsonb
  )
  into v_origin_quality
  from (
    select
      coalesce(nullif(trim(l.metadata ->> 'origin'), ''), 'manual') as origin_key,
      count(*)::int as total_leads,
      count(*) filter (where l.status = 'convertido')::int as converted_leads,
      round(
        avg(
          extract(epoch from (l.closed_at - l.created_at)) / 86400
        ) filter (where l.status = 'convertido' and l.closed_at is not null)::numeric,
        1
      ) as cycle_days
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
    group by 1
  ) grouped_quality;

  -- Adquisicion mensual desglosada por origen, para las barras apiladas.
  -- Se reusa la misma ventana de seis meses que `monthlyCounts`.
  with months as (
    select generate_series(5, 0, -1) as offset_month
  ),
  labeled_months as (
    select
      offset_month,
      date_trunc('month', now()) - make_interval(months => offset_month) as month_start
    from months
  ),
  per_month_origin as (
    select
      lm.month_start,
      coalesce(nullif(trim(l.metadata ->> 'origin'), ''), 'manual') as origin_key,
      count(l.id)::int as lead_count
    from labeled_months lm
    left join public.leads l
      on l.user_id = auth.uid()
     and l.deleted_at is null
     and l.created_at >= lm.month_start
     and l.created_at < (lm.month_start + interval '1 month')
    where l.id is not null
    group by lm.month_start, 2
  ),
  per_month as (
    select
      lm.month_start,
      coalesce(
        (
          select jsonb_object_agg(pmo.origin_key, pmo.lead_count)
          from per_month_origin pmo
          where pmo.month_start = lm.month_start
        ),
        '{}'::jsonb
      ) as counts
    from labeled_months lm
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object('name', upper(to_char(month_start, 'Mon')), 'counts', counts)
      order by month_start
    ),
    '[]'::jsonb
  )
  into v_monthly_by_origin
  from per_month;

  -- Cuanto se tarda entre etapas.
  --
  -- Solo salen dos tramos, y es todo lo que el modelo permite: `leads` guarda
  -- `first_contacted_at` y `closed_at`, pero no cuando paso a "interesado". El
  -- grafico mostraba cuatro etapas con numeros inventados; con esto muestra las
  -- dos que existen de verdad.
  select jsonb_build_object(
    'nuevoAContactado', (
      select round(avg(extract(epoch from (l.first_contacted_at - l.created_at)) / 86400)::numeric, 1)
      from public.leads l
      where l.user_id = auth.uid()
        and l.deleted_at is null
        and l.first_contacted_at is not null
        and l.first_contacted_at >= l.created_at
    ),
    'contactadoACierre', (
      select round(avg(extract(epoch from (l.closed_at - l.first_contacted_at)) / 86400)::numeric, 1)
      from public.leads l
      where l.user_id = auth.uid()
        and l.deleted_at is null
        and l.closed_at is not null
        and l.first_contacted_at is not null
        and l.closed_at >= l.first_contacted_at
    )
  )
  into v_stage_durations;

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
      'monthlyCounts', v_monthly_counts,
      'originCounts', v_origin_counts,
      'channelCounts', v_channel_counts,
      'lossReasons', v_loss_reasons,
      'originQuality', v_origin_quality,
      'monthlyByOrigin', v_monthly_by_origin,
      'stageDurations', v_stage_durations
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

-- REVERSION
--
--   Volver a aplicar sql/migrations/101_dashboard_snapshot_loss_reasons.sql.
