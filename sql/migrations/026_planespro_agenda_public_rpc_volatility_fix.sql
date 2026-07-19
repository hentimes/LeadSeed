-- Query permanente
-- Dominio: planespro / agenda / disponibilidad
-- Objetivo: permitir que la disponibilidad publica inicialice defaults cuando se llama desde PostgREST

CREATE OR REPLACE FUNCTION public.resolve_planespro_booking_context(
  p_capture_ref text DEFAULT NULL,
  p_source_channel text DEFAULT 'general'
)
RETURNS TABLE (
  owner_user_id uuid,
  capture_link_id bigint,
  capture_ref text,
  source_channel text,
  link_name text,
  campaign_name text,
  timezone text,
  slot_duration_minutes integer,
  slot_buffer_minutes integer,
  allow_public_booking boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capture_ref text := public.normalize_capture_ref(p_capture_ref);
  v_source_channel text := lower(nullif(trim(coalesce(p_source_channel, 'general')), ''));
  v_owner_user_id uuid;
  v_capture_link_id bigint;
  v_link_name text;
  v_campaign_name text;
BEGIN
  IF v_source_channel NOT IN ('pb', 'general') THEN
    v_source_channel := CASE WHEN v_capture_ref IS NOT NULL THEN 'pb' ELSE 'general' END;
  END IF;

  IF v_source_channel = 'pb' AND v_capture_ref IS NOT NULL THEN
    SELECT cl.owner_user_id, cl.id, cl.label, cl.campaign_name
    INTO v_owner_user_id, v_capture_link_id, v_link_name, v_campaign_name
    FROM public.capture_links cl
    WHERE cl.ref_code = v_capture_ref
      AND cl.is_active = true
      AND cl.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_owner_user_id IS NULL THEN
    SELECT p.id
    INTO v_owner_user_id
    FROM public.profiles p
    WHERE p.email = 'planespro.cl@gmail.com'
    LIMIT 1;
  END IF;

  IF v_owner_user_id IS NULL THEN
    SELECT p.id
    INTO v_owner_user_id
    FROM public.profiles p
    WHERE p.role = 'admin'
    ORDER BY p.created_at
    LIMIT 1;
  END IF;

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'no profile available to receive public booking';
  END IF;

  PERFORM public.ensure_user_calendar_defaults(v_owner_user_id);

  RETURN QUERY
  SELECT
    v_owner_user_id,
    v_capture_link_id,
    v_capture_ref,
    v_source_channel,
    v_link_name,
    v_campaign_name,
    coalesce(settings.timezone, 'America/Santiago') AS timezone,
    coalesce(settings.slot_duration_minutes, 45) AS slot_duration_minutes,
    coalesce(settings.slot_buffer_minutes, 15) AS slot_buffer_minutes,
    coalesce(settings.allow_public_booking, true) AS allow_public_booking
  FROM public.user_calendar_settings settings
  WHERE settings.user_id = v_owner_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_planespro_public_available_slots(
  p_capture_ref text DEFAULT NULL,
  p_source_channel text DEFAULT 'general',
  p_start_date date DEFAULT timezone('America/Santiago'::text, now())::date,
  p_days integer DEFAULT 21
)
RETURNS TABLE (
  slot_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  starts_at_local text,
  ends_at_local text,
  label text,
  timezone text,
  status text,
  disabled boolean,
  capture_link_id bigint,
  source_channel text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context record;
  v_day date;
  v_day_of_week integer;
  v_start_time time;
  v_end_time time;
  v_is_off_day boolean;
  v_slot_span interval;
  v_slot_duration interval;
  v_local_start timestamp;
  v_local_end timestamp;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_conflict_exists boolean;
  v_days integer := least(greatest(coalesce(p_days, 21), 1), 60);
BEGIN
  SELECT *
  INTO v_context
  FROM public.resolve_planespro_booking_context(p_capture_ref, p_source_channel)
  LIMIT 1;

  IF NOT coalesce(v_context.allow_public_booking, true) THEN
    RETURN;
  END IF;

  v_slot_duration := make_interval(mins => coalesce(v_context.slot_duration_minutes, 45));
  v_slot_span := make_interval(mins => coalesce(v_context.slot_duration_minutes, 45) + coalesce(v_context.slot_buffer_minutes, 15));

  FOR v_day IN
    SELECT generate_series(p_start_date, p_start_date + (v_days - 1), interval '1 day')::date
  LOOP
    v_day_of_week := extract(dow from v_day)::integer;
    v_start_time := null;
    v_end_time := null;
    v_is_off_day := false;

    SELECT override.is_off_day, override.start_time, override.end_time
    INTO v_is_off_day, v_start_time, v_end_time
    FROM public.user_availability_overrides override
    WHERE override.user_id = v_context.owner_user_id
      AND override.specific_date = v_day
    LIMIT 1;

    IF NOT FOUND THEN
      SELECT availability.start_time, availability.end_time
      INTO v_start_time, v_end_time
      FROM public.user_availability availability
      WHERE availability.user_id = v_context.owner_user_id
        AND availability.day_of_week = v_day_of_week
        AND availability.is_active = true
      LIMIT 1;

      v_is_off_day := NOT FOUND;
    END IF;

    IF v_is_off_day OR v_start_time IS NULL OR v_end_time IS NULL THEN
      CONTINUE;
    END IF;

    v_local_start := (v_day::timestamp + v_start_time);

    WHILE v_local_start + v_slot_duration <= (v_day::timestamp + v_end_time) LOOP
      v_local_end := v_local_start + v_slot_duration;
      v_starts_at := v_local_start AT TIME ZONE v_context.timezone;
      v_ends_at := v_local_end AT TIME ZONE v_context.timezone;

      SELECT EXISTS (
        SELECT 1
        FROM public.appointments appointment
        WHERE appointment.user_id = v_context.owner_user_id
          AND appointment.status IN ('pendiente', 'agendada', 'confirmada', 'tentativa')
          AND appointment.start_time < v_ends_at
          AND appointment.end_time > v_starts_at
        UNION ALL
        SELECT 1
        FROM public.user_availability_blocks block
        WHERE block.user_id = v_context.owner_user_id
          AND block.starts_at < v_ends_at
          AND block.ends_at > v_starts_at
      )
      INTO v_conflict_exists;

      slot_date := v_day;
      starts_at := v_starts_at;
      ends_at := v_ends_at;
      starts_at_local := to_char(v_local_start, 'YYYY-MM-DD"T"HH24:MI:SS');
      ends_at_local := to_char(v_local_end, 'YYYY-MM-DD"T"HH24:MI:SS');
      label := to_char(v_local_start, 'HH24:MI');
      timezone := v_context.timezone;
      status := CASE
        WHEN v_starts_at <= timezone('utc'::text, now()) THEN 'past_time'
        WHEN v_conflict_exists THEN 'busy'
        ELSE 'free'
      END;
      disabled := status <> 'free';
      capture_link_id := v_context.capture_link_id;
      source_channel := v_context.source_channel;

      RETURN NEXT;

      v_local_start := v_local_start + v_slot_span;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.resolve_planespro_booking_context(text, text) IS
'Resuelve owner de agenda para formulario general o pb e inicializa defaults; debe ser VOLATILE por su side effect controlado.';

COMMENT ON FUNCTION public.get_planespro_public_available_slots(text, text, date, integer) IS
'Devuelve disponibilidad publica por capture_ref o canal general; VOLATILE porque puede inicializar defaults de agenda.';

NOTIFY pgrst, 'reload schema';
