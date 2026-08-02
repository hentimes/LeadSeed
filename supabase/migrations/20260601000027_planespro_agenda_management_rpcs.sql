-- Query permanente
-- Dominio: planespro_agenda / gestion interna
-- Objetivo: exponer RPCs autenticadas para que MENSAJES gestione agenda sin mutar tablas directo desde UI

CREATE OR REPLACE FUNCTION public.get_my_calendar_settings()
RETURNS TABLE (
  user_id uuid,
  timezone text,
  slot_duration_minutes integer,
  slot_buffer_minutes integer,
  allow_public_booking boolean,
  google_calendar_id text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  PERFORM public.ensure_user_calendar_defaults(v_user_id);

  RETURN QUERY
  SELECT
    settings.user_id,
    settings.timezone,
    settings.slot_duration_minutes,
    settings.slot_buffer_minutes,
    settings.allow_public_booking,
    settings.google_calendar_id,
    settings.updated_at
  FROM public.user_calendar_settings settings
  WHERE settings.user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_calendar_settings(
  p_timezone text DEFAULT 'America/Santiago',
  p_slot_duration_minutes integer DEFAULT 45,
  p_slot_buffer_minutes integer DEFAULT 15,
  p_allow_public_booking boolean DEFAULT true
)
RETURNS TABLE (
  user_id uuid,
  timezone text,
  slot_duration_minutes integer,
  slot_buffer_minutes integer,
  allow_public_booking boolean,
  google_calendar_id text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_timezone text := nullif(trim(coalesce(p_timezone, 'America/Santiago')), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_slot_duration_minutes < 15 OR p_slot_duration_minutes > 180 THEN
    RAISE EXCEPTION 'slot duration must be between 15 and 180 minutes';
  END IF;

  IF p_slot_buffer_minutes < 0 OR p_slot_buffer_minutes > 120 THEN
    RAISE EXCEPTION 'slot buffer must be between 0 and 120 minutes';
  END IF;

  PERFORM public.ensure_user_calendar_defaults(v_user_id);

  UPDATE public.user_calendar_settings settings
  SET
    timezone = coalesce(v_timezone, 'America/Santiago'),
    slot_duration_minutes = p_slot_duration_minutes,
    slot_buffer_minutes = p_slot_buffer_minutes,
    allow_public_booking = coalesce(p_allow_public_booking, true),
    updated_at = timezone('utc'::text, now())
  WHERE settings.user_id = v_user_id;

  RETURN QUERY
  SELECT *
  FROM public.get_my_calendar_settings();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_availability_rules()
RETURNS TABLE (
  id bigint,
  day_of_week integer,
  start_time time,
  end_time time,
  is_active boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  PERFORM public.ensure_user_calendar_defaults(v_user_id);

  RETURN QUERY
  SELECT
    availability.id,
    availability.day_of_week,
    availability.start_time,
    availability.end_time,
    availability.is_active,
    availability.updated_at
  FROM public.user_availability availability
  WHERE availability.user_id = v_user_id
  ORDER BY availability.day_of_week;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_my_availability_rules(p_rules jsonb)
RETURNS TABLE (
  id bigint,
  day_of_week integer,
  start_time time,
  end_time time,
  is_active boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rule jsonb;
  v_day integer;
  v_start_time time;
  v_end_time time;
  v_is_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'rules must be a json array';
  END IF;

  PERFORM public.ensure_user_calendar_defaults(v_user_id);

  FOR v_rule IN SELECT value FROM jsonb_array_elements(p_rules)
  LOOP
    v_day := (v_rule->>'day_of_week')::integer;
    v_start_time := (v_rule->>'start_time')::time;
    v_end_time := (v_rule->>'end_time')::time;
    v_is_active := coalesce((v_rule->>'is_active')::boolean, true);

    IF v_day < 0 OR v_day > 6 THEN
      RAISE EXCEPTION 'day_of_week must be between 0 and 6';
    END IF;

    IF v_start_time >= v_end_time THEN
      RAISE EXCEPTION 'start_time must be before end_time';
    END IF;

    INSERT INTO public.user_availability (
      user_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_day,
      v_start_time,
      v_end_time,
      v_is_active,
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT (user_id, day_of_week)
    DO UPDATE SET
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      is_active = excluded.is_active,
      updated_at = timezone('utc'::text, now());
  END LOOP;

  RETURN QUERY
  SELECT *
  FROM public.list_my_availability_rules();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_availability_blocks(
  p_from date DEFAULT current_date,
  p_to date DEFAULT current_date + 30
)
RETURNS TABLE (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  block_type text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from date := coalesce(p_from, current_date);
  v_to date := coalesce(p_to, current_date + 30);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF v_to < v_from THEN
    RAISE EXCEPTION 'p_to must be greater than or equal to p_from';
  END IF;

  RETURN QUERY
  SELECT
    block.id,
    block.starts_at,
    block.ends_at,
    block.block_type,
    block.note,
    block.created_at,
    block.updated_at
  FROM public.user_availability_blocks block
  WHERE block.user_id = v_user_id
    AND block.starts_at < (v_to + 1)::timestamptz
    AND block.ends_at >= v_from::timestamptz
  ORDER BY block.starts_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_my_availability_block(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_block_type text DEFAULT 'manual',
  p_note text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  block_type text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_block_type text := lower(nullif(trim(coalesce(p_block_type, 'manual')), ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'valid start and end timestamps are required';
  END IF;

  IF v_block_type NOT IN ('manual', 'full_day') THEN
    v_block_type := 'manual';
  END IF;

  RETURN QUERY
  INSERT INTO public.user_availability_blocks (
    user_id,
    starts_at,
    ends_at,
    block_type,
    note,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_starts_at,
    p_ends_at,
    v_block_type,
    nullif(trim(coalesce(p_note, '')), ''),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING
    user_availability_blocks.id,
    user_availability_blocks.starts_at,
    user_availability_blocks.ends_at,
    user_availability_blocks.block_type,
    user_availability_blocks.note,
    user_availability_blocks.created_at,
    user_availability_blocks.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_availability_block(p_block_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  DELETE FROM public.user_availability_blocks block
  WHERE block.id = p_block_id
    AND block.user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_appointments(
  p_from date DEFAULT current_date,
  p_to date DEFAULT current_date + 14
)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  lead_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  source_channel text,
  capture_ref text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from date := coalesce(p_from, current_date);
  v_to date := coalesce(p_to, current_date + 14);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF v_to < v_from THEN
    RAISE EXCEPTION 'p_to must be greater than or equal to p_from';
  END IF;

  RETURN QUERY
  SELECT
    appointment.id,
    appointment.lead_id,
    lead.name,
    appointment.start_time,
    appointment.end_time,
    appointment.status,
    appointment.source_channel,
    appointment.capture_ref,
    appointment.notes,
    appointment.created_at,
    appointment.updated_at
  FROM public.appointments appointment
  LEFT JOIN public.leads lead ON lead.id = appointment.lead_id
  WHERE appointment.user_id = v_user_id
    AND appointment.start_time < (v_to + 1)::timestamptz
    AND appointment.end_time >= v_from::timestamptz
  ORDER BY appointment.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_calendar_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_calendar_settings(text, integer, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_availability_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_availability_rules(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_availability_blocks(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_my_availability_block(timestamptz, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_availability_block(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_appointments(date, date) TO authenticated;

COMMENT ON FUNCTION public.get_my_calendar_settings() IS
'Returns calendar settings for the authenticated user after ensuring defaults.';

COMMENT ON FUNCTION public.save_my_availability_rules(jsonb) IS
'Bulk upserts weekly availability for the authenticated user. Intended for MENSAJES settings UI.';
