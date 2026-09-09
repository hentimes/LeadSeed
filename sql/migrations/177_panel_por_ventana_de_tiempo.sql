-- panel_por_ventana_de_tiempo
--
-- Tipo:           reemplazo de funcion (cambia la semantica de un parametro)
-- Objeto:         public.get_my_dashboard_snapshot(text, text)
-- Clase:          correccion de un fallo de diseño
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la 175), pero hay que revertir el cliente
--
-- EL FALLO: UN SELECTOR QUE MOVIA SEIS NUMEROS
--
-- El panel tenia un desplegable de periodo que, en toda la pantalla, solo
-- afectaba a TRES campos: `createdCompare`, `sendSummary.compare` y
-- `completedCompare`. O sea a las seis flechitas de tendencia y a nada mas.
--
-- Todo lo demas -total de leads, conversion, embudo, fuentes, motivos de
-- descarte- eran acumulados desde el principio de los tiempos, indiferentes al
-- selector. Cambiabas de "Ayer" a "Mes pasado" y la pantalla se quedaba igual,
-- porque en la practica lo estaba.
--
-- La causa era la semantica del parametro: comparaba hoy contra UN DIA del
-- pasado (hoy contra el mismo dia de hace 30), en vez de mostrar el periodo.
--
-- LA CORRECCION: EL PARAMETRO PASA A SER UNA VENTANA
--
--   p_period: 'today' | 'last7' | 'last30' | 'last90' | 'last180' | 'last365'
--
-- La ventana termina al final de hoy y se extiende hacia atras. La comparacion
-- es contra la ventana ANTERIOR del mismo tamaño y pegada a ella: siete dias
-- contra los siete anteriores, que es lo que significa comparar periodos.
--
-- Ahora la ventana gobierna los agregados de leads -total, contactados,
-- convertidos, estados, origenes, canales, motivos de descarte, calidad por
-- fuente, tiempos por etapa-, los envios y las tareas completadas.
--
-- QUE NO SIGUE LA VENTANA, Y POR QUE
--
-- 1. `forgotten`, los leads olvidados. Es una alerta de estado ACTUAL: "estos
--    llevan mas de siete dias sin contacto". Acotarla a una ventana la vaciaria
--    justo cuando mas util es.
--
-- 2. `sendSummary.hoy`, que se añade. Alimenta las metas diarias, y el tope de
--    WhatsApp es un tope POR DIA (migracion 161: "no pases de 50 o te
--    arriesgas a que te bloqueen"). Escalarlo a 350 semanales lo convertiria
--    en una cuota: podrias mandarlos todos el lunes, salir "dentro de la meta"
--    y que te bloqueen igual.
--
-- 3. `monthlyCounts` y `monthlyByOrigin`, que son series de seis meses fijos.
--    Son un historico, no una foto del periodo.
--
-- 4. Las tareas pendientes y vencidas: tambien estado actual.
--
-- COMPATIBILIDAD
--
-- El `else` de la ventana es un dia, asi que un cliente que siga mandando
-- 'yesterday' o 'lastWeek' obtiene el comportamiento de 'today' -la ventana de
-- hoy- en vez de romperse. `sendSummary.today` conserva el nombre y pasa a
-- significar la ventana; con 'today' vale exactamente lo que valia antes.
--
-- El nombre del parametro cambia de `p_compare_period` a `p_period`, y eso
-- obliga a borrar la funcion antes: PostgreSQL no renombra parametros con
-- CREATE OR REPLACE.

drop function if exists public.get_my_dashboard_snapshot(text, text);

create or replace function public.get_my_dashboard_snapshot(
  p_period text default 'today',
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text := coalesce(nullif(trim(p_timezone), ''), 'UTC');
  v_hoy_local timestamp := date_trunc('day', now() at time zone v_tz);
  v_today_start timestamptz := v_hoy_local at time zone v_tz;
  v_tomorrow_start timestamptz := (v_hoy_local + interval '1 day') at time zone v_tz;
  -- Cuantos dias abarca la ventana elegida.
  v_dias int;
  -- La ventana: [inicio, fin). El fin es siempre el final de HOY.
  v_win_start timestamptz;
  v_win_end timestamptz;
  -- La ventana anterior, del mismo tamaño y pegada a la de arriba.
  v_prev_start timestamptz;
  v_prev_end timestamptz;
  v_status_counts jsonb := '{}'::jsonb;
  v_monthly_counts jsonb := '[]'::jsonb;
  v_origin_counts jsonb := '{}'::jsonb;
  v_channel_counts jsonb := '{}'::jsonb;
  v_loss_reasons jsonb := '[]'::jsonb;
  v_origin_quality jsonb := '[]'::jsonb;
  v_monthly_by_origin jsonb := '[]'::jsonb;
  v_stage_durations jsonb := '{}'::jsonb;
begin
  v_dias := case p_period
    when 'last7' then 7
    when 'last30' then 30
    when 'last90' then 90
    when 'last180' then 180
    when 'last365' then 365
    else 1
  end;

  /*
   * La ventana termina al final de HOY y se extiende hacia atras. La anterior
   * es del mismo tamaño y esta pegada a ella: siete dias contra los siete
   * anteriores, no contra un dia suelto de hace una semana.
   *
   * Se resta `v_dias - 1` porque hoy cuenta: "ultimos 7 dias" son hoy y los
   * seis de antes, no hoy y los siete de antes.
   */
  v_win_end := v_tomorrow_start;
  v_win_start := (v_hoy_local - make_interval(days => v_dias - 1)) at time zone v_tz;
  v_prev_end := v_win_start;
  v_prev_start := (v_hoy_local - make_interval(days => v_dias * 2 - 1)) at time zone v_tz;

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
      and l.created_at >= v_win_start
      and l.created_at < v_win_end
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
      and l.created_at >= v_win_start
      and l.created_at < v_win_end
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
      and l.created_at >= v_win_start
      and l.created_at < v_win_end
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
      and l.created_at >= v_win_start
      and l.created_at < v_win_end
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
      and l.created_at >= v_win_start
      and l.created_at < v_win_end
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
          and l.created_at >= v_win_start
          and l.created_at < v_win_end
      ),
      'contacted', (
        select count(*)::int
        from public.leads l
        where l.user_id = auth.uid()
          and l.deleted_at is null
          and l.created_at >= v_win_start
          and l.created_at < v_win_end
          and coalesce(l.status, 'nuevo') <> 'nuevo'
      ),
      'converted', (
        select count(*)::int
        from public.leads l
        where l.user_id = auth.uid()
          and l.deleted_at is null
          and l.created_at >= v_win_start
          and l.created_at < v_win_end
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
      -- Leads entrados hoy y en el periodo de comparacion. Sustituyen a la
      -- tarjeta "Respuestas", que mostraba un cero fijo porque el CRM no
      -- registra las respuestas entrantes en ninguna parte.
      -- Leads entrados EN LA VENTANA y en la anterior. Con 'today' la ventana
      -- es un dia, asi que se comporta igual que antes.
      'createdToday', (
        select count(*)::int
        from public.leads l
        where l.user_id = auth.uid()
          and l.deleted_at is null
          and l.created_at >= v_win_start
          and l.created_at < v_win_end
      ),
      'createdCompare', (
        select count(*)::int
        from public.leads l
        where l.user_id = auth.uid()
          and l.deleted_at is null
          and l.created_at >= v_prev_start
          and l.created_at < v_prev_end
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
      /*
       * `hoy` NO sigue la ventana, a proposito.
       *
       * Alimenta la tarjeta de metas diarias, y el tope de WhatsApp es un
       * TOPE POR DIA -"no pases de 50 o te arriesgas a que te bloqueen"-. Con
       * "ultimos 7 dias" seleccionado, multiplicar la meta por siete la
       * convertiria en una cuota semanal: podrias mandar 350 el lunes, salir
       * "dentro de la meta" y que te bloqueen igual.
       */
      'hoy', jsonb_build_object(
        'whatsapp', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'whatsapp'
            and sl.deleted_at is null
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        ),
        'email', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'email'
            and sl.deleted_at is null
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        ),
        'call', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'call'
            and sl.deleted_at is null
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        ),
        'total', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.deleted_at is null
            and sl.sent_at >= v_today_start
            and sl.sent_at < v_tomorrow_start
        )
      ),
      -- `today` conserva el nombre por compatibilidad, pero ahora es LA
      -- VENTANA. Con p_period = 'today' la ventana es un dia y vale lo mismo.
      'today', jsonb_build_object(
        'whatsapp', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'whatsapp'
            and sl.deleted_at is null
            and sl.sent_at >= v_win_start
            and sl.sent_at < v_win_end
        ),
        'email', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'email'
            and sl.deleted_at is null
            and sl.sent_at >= v_win_start
            and sl.sent_at < v_win_end
        ),
        'call', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'call'
            and sl.deleted_at is null
            and sl.sent_at >= v_win_start
            and sl.sent_at < v_win_end
        ),
        'total', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.deleted_at is null
            and sl.sent_at >= v_win_start
            and sl.sent_at < v_win_end
        )
      ),
      'compare', jsonb_build_object(
        'whatsapp', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'whatsapp'
            and sl.deleted_at is null
            and sl.sent_at >= v_prev_start
            and sl.sent_at < v_prev_end
        ),
        'email', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'email'
            and sl.deleted_at is null
            and sl.sent_at >= v_prev_start
            and sl.sent_at < v_prev_end
        ),
        'call', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.template_type = 'call'
            and sl.deleted_at is null
            and sl.sent_at >= v_prev_start
            and sl.sent_at < v_prev_end
        ),
        'total', (
          select count(*)::int
          from public.send_logs sl
          where sl.user_id = auth.uid()
            and sl.deleted_at is null
            and sl.sent_at >= v_prev_start
            and sl.sent_at < v_prev_end
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
      -- Antes esto filtraba por `created_at`, asi que contaba tareas *creadas*
      -- hoy que estuvieran completadas, no tareas completadas hoy. El sello lo
      -- pone el trigger de la migracion 103.
      'completedToday', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
          and t.completed_at >= v_win_start
          and t.completed_at < v_win_end
      ),
      'completedCompare', (
        select count(*)::int
        from public.tasks t
        where t.user_id = auth.uid()
          and t.completed_at >= v_prev_start
          and t.completed_at < v_prev_end
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

revoke all on function public.get_my_dashboard_snapshot(text, text) from public;
grant execute on function public.get_my_dashboard_snapshot(text, text) to authenticated;

comment on function public.get_my_dashboard_snapshot(text, text) is
  'Snapshot del panel sobre una VENTANA (p_period: today, last7, last30, last90, last180, last365). Compara contra la ventana anterior del mismo tamaño. sendSummary.hoy va aparte y es siempre el dia de hoy, porque las metas diarias no se escalan.';

-- REVERSION
--
--   Volver a aplicar sql/migrations/175_comparar_contra_trimestre_y_semestre.sql
--   despues de borrar la firma nueva:
--   drop function if exists public.get_my_dashboard_snapshot(text, text);
--
--   Ojo: eso devuelve el selector a mover seis numeros, y hay que revertir
--   tambien el tipo `PeriodoPanel` del cliente.
