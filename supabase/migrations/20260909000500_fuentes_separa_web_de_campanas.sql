-- fuentes_separa_web_de_campanas
--
-- Tipo:           correccion de una funcion (cambia claves de salida)
-- Objeto:         public.get_my_dashboard_snapshot(text, text)
-- Clase:          correccion de un fallo de diseño
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la 177), pero hay que revertir el cliente
--
-- EL FALLO: "FORMULARIO 100%" NO DICE NADA
--
-- El panel agrupaba en una sola fuente todo lo que entra por un formulario, y
-- no es lo mismo:
--
--   - El formulario de la web es alguien que llego por su cuenta.
--   - El formulario de una campaña es alguien por el que se pago.
--
-- Verlos juntos borra justo la pregunta que la tarjeta existe para responder:
-- de donde viene el negocio, y si la publicidad esta trayendo algo.
--
-- LA DISTINCION YA ESTABA EN LOS DATOS
--
-- No hace falta capturar nada nuevo. Desde la 022, `source_channel` vale:
--
--   'general' -> formulario de la web
--   'pb'      -> se abrio desde un enlace de captura, o sea una campaña
--   'retiro'  -> el formulario de retiro (añadido en la 090)
--
-- Y desde la 069 cada lead de campaña guarda ademas `capture_link_name` y
-- `capture_campaign`. Nada de eso lo miraba el panel.
--
-- QUE CAMBIA
--
-- 1. `originCounts` desglosa `web_form` en `form_web`, `form_campaign` y
--    `form_retiro`. `manual` e `imported` no cambian.
--
-- 2. Se añade `campaignCounts`: que enlace y que campaña trajo cuantos leads,
--    de mas a menos. Agrupado por los dos juntos porque una campaña puede
--    tener varios enlaces, y saber cual funciono es el motivo de separarlos.
--
-- OJO CON EL CLIENTE
--
-- Las claves de `originCounts` cambian, asi que un cliente viejo mostraria
-- "form_web" en crudo donde antes decia "Formulario". No rompe nada, pero se
-- ve mal: las etiquetas se actualizan en el mismo commit.

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
  v_campaign_counts jsonb := '[]'::jsonb;
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
  /*
   * EL ORIGEN, DESGLOSADO POR CANAL.
   *
   * Antes solo distinguia tres cosas -manual, importado, web_form-, asi que
   * todo lo que entraba por un formulario caia en el mismo saco. Y no es lo
   * mismo: el formulario de la web es alguien que llego por su cuenta, y el de
   * una campaña es alguien por el que se pago. Verlos juntos como
   * "Formulario 100%" no dice nada de donde viene el negocio.
   *
   * La distincion ya estaba en los datos desde la 022: `source_channel` vale
   * 'general' para el formulario de la web y 'pb' para el que se abre desde un
   * enlace de captura -o sea, desde una campaña o un anuncio-. La 090 añadio
   * 'retiro'. Lo unico que faltaba era mirarlo aqui.
   *
   * Los leads que no vienen de formulario conservan su clave de siempre, asi
   * que 'manual' e 'imported' no cambian.
   */
  select coalesce(jsonb_object_agg(origin_key, origin_count), '{}'::jsonb)
  into v_origin_counts
  from (
    select
      case
        when coalesce(nullif(trim(l.metadata ->> 'origin'), ''), 'manual') <> 'web_form'
          then coalesce(nullif(trim(l.metadata ->> 'origin'), ''), 'manual')
        -- Un lead de formulario sin canal declarado es de la web: 'pb' solo se
        -- pone cuando hay un enlace de captura de por medio.
        when coalesce(nullif(trim(l.metadata ->> 'source_channel'), ''), 'general') = 'pb'
          then 'form_campaign'
        when nullif(trim(l.metadata ->> 'source_channel'), '') = 'retiro'
          then 'form_retiro'
        else 'form_web'
      end as origin_key,
      count(*)::int as origin_count
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
      and l.created_at >= v_win_start
      and l.created_at < v_win_end
    group by 1
  ) grouped_origins;

  /*
   * QUE CAMPAÑA TRAJO CADA LEAD.
   *
   * `capture_link_name` y `capture_campaign` se guardan en el lead desde la
   * 069, y hasta ahora no los miraba nadie. Con el desglose de arriba ya se
   * sabe CUANTOS vinieron de campañas; esto dice de cuales.
   *
   * Se agrupa por los dos juntos porque una campaña puede tener varios
   * enlaces -"PP: Ventas" y "PP: Retiros" dentro de "Videos Agosto 2026"- y
   * saber cual de los dos funciono es justo el motivo de tener enlaces
   * separados.
   *
   * Los que no declaran campaña salen como "Sin campaña" en vez de
   * repartirse: son enlaces creados sin ponerle nombre a la campaña, y
   * mezclarlos con los que si la tienen inventaria el dato.
   */
  select coalesce(
    jsonb_agg(
      jsonb_build_object('enlace', link_key, 'campana', campaign_key, 'leads', lead_count)
      order by lead_count desc
    ),
    '[]'::jsonb
  )
  into v_campaign_counts
  from (
    select
      coalesce(nullif(trim(l.metadata ->> 'capture_link_name'), ''), 'Sin nombre') as link_key,
      coalesce(nullif(trim(l.metadata ->> 'capture_campaign'), ''), 'Sin campaña') as campaign_key,
      count(*)::int as lead_count
    from public.leads l
    where l.user_id = auth.uid()
      and l.deleted_at is null
      and l.created_at >= v_win_start
      and l.created_at < v_win_end
      and coalesce(nullif(trim(l.metadata ->> 'source_channel'), ''), '') = 'pb'
    group by 1, 2
  ) grouped_campaigns;

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
      'campaignCounts', v_campaign_counts,
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
  'Snapshot del panel sobre una VENTANA (p_period: today, last7, last30, last90, last180, last365). Compara contra la ventana anterior del mismo tamaño. sendSummary.hoy va aparte y es siempre el dia de hoy, porque las metas diarias no se escalan. originCounts separa el formulario de la web (form_web) del de campañas (form_campaign), y campaignCounts dice de que campaña vino cada uno.';

-- REVERSION
--
--   Volver a aplicar sql/migrations/177_panel_por_ventana_de_tiempo.sql
--   despues de borrar la firma:
--   drop function if exists public.get_my_dashboard_snapshot(text, text);
--
--   Hay que revertir tambien las etiquetas de origen del cliente.
