-- Query permanente
-- Dominio: planespro / agenda / disponibilidad
-- Objetivo: preparar Supabase como fuente de verdad para disponibilidad publica, bloqueos y citas

CREATE TABLE IF NOT EXISTS public.user_calendar_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/Santiago',
  slot_duration_minutes integer NOT NULL DEFAULT 45 CHECK (slot_duration_minutes BETWEEN 15 AND 180),
  slot_buffer_minutes integer NOT NULL DEFAULT 15 CHECK (slot_buffer_minutes BETWEEN 0 AND 120),
  allow_public_booking boolean NOT NULL DEFAULT true,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_calendar_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google' CHECK (provider IN ('google')),
  google_email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  refresh_token text,
  access_token text,
  token_scope text,
  token_expires_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_availability_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  block_type text NOT NULL DEFAULT 'manual' CHECK (block_type IN ('manual', 'full_day', 'google', 'system')),
  note text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CHECK (ends_at > starts_at)
);

ALTER TABLE public.user_availability
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.user_availability_overrides
ADD COLUMN IF NOT EXISTS note text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Santiago',
ADD COLUMN IF NOT EXISTS source_system text NOT NULL DEFAULT 'mensajes',
ADD COLUMN IF NOT EXISTS source_channel text,
ADD COLUMN IF NOT EXISTS capture_link_id bigint REFERENCES public.capture_links(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS capture_ref text,
ADD COLUMN IF NOT EXISTS appointment_duration_minutes integer NOT NULL DEFAULT 45 CHECK (appointment_duration_minutes BETWEEN 15 AND 180),
ADD COLUMN IF NOT EXISTS appointment_buffer_minutes integer NOT NULL DEFAULT 15 CHECK (appointment_buffer_minutes BETWEEN 0 AND 120),
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.appointments DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END $$;

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_status_check
CHECK (status IN ('pendiente', 'agendada', 'confirmada', 'tentativa', 'cancelada', 'rechazada', 'completada', 'no_asistio'));

CREATE INDEX IF NOT EXISTS user_availability_user_day_idx
ON public.user_availability (user_id, day_of_week);

CREATE INDEX IF NOT EXISTS user_availability_blocks_user_range_idx
ON public.user_availability_blocks (user_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS appointments_user_range_idx
ON public.appointments (user_id, start_time, end_time);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_user_start_active_idx
ON public.appointments (user_id, start_time)
WHERE status IN ('pendiente', 'agendada', 'confirmada', 'tentativa');

ALTER TABLE public.user_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calendar settings" ON public.user_calendar_settings;
CREATE POLICY "Users can view their own calendar settings"
ON public.user_calendar_settings
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own calendar settings" ON public.user_calendar_settings;
CREATE POLICY "Users can manage their own calendar settings"
ON public.user_calendar_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own availability blocks" ON public.user_availability_blocks;
CREATE POLICY "Users can manage their own availability blocks"
ON public.user_availability_blocks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Calendar connections are service managed" ON public.user_calendar_connections;
CREATE POLICY "Calendar connections are service managed"
ON public.user_calendar_connections
FOR ALL
USING (false)
WITH CHECK (false);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_availability'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_availability';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_availability_overrides'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_availability_overrides';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_availability_blocks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_availability_blocks';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_user_calendar_defaults(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  INSERT INTO public.user_calendar_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  FOR v_day IN 0..6 LOOP
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
      p_user_id,
      v_day,
      '08:00'::time,
      '20:00'::time,
      v_day BETWEEN 1 AND 5,
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT (user_id, day_of_week) DO NOTHING;
  END LOOP;
END;
$$;

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
STABLE
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
STABLE
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

CREATE OR REPLACE FUNCTION public.parse_planespro_local_datetime(
  p_value text,
  p_timezone text DEFAULT 'America/Santiago'
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value text := nullif(trim(coalesce(p_value, '')), '');
  v_timezone text := nullif(trim(coalesce(p_timezone, 'America/Santiago')), '');
BEGIN
  IF v_value IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_value ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
    RETURN v_value::timestamptz;
  END IF;

  RETURN replace(v_value, ' ', 'T')::timestamp AT TIME ZONE coalesce(v_timezone, 'America/Santiago');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_planespro_appointment_for_lead(
  p_lead_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_context record;
  v_requested_raw text;
  v_requested_at timestamptz;
  v_duration integer;
  v_buffer integer;
  v_appointment_id uuid;
BEGIN
  SELECT *
  INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead not found';
  END IF;

  SELECT *
  INTO v_context
  FROM public.resolve_planespro_booking_context(
    coalesce(p_payload->>'capture_ref', p_payload->>'ref', v_lead.metadata->>'capture_ref'),
    coalesce(p_payload->>'source_channel', v_lead.metadata->>'source_channel', 'general')
  )
  LIMIT 1;

  v_duration := coalesce(v_context.slot_duration_minutes, 45);
  v_buffer := coalesce(v_context.slot_buffer_minutes, 15);
  v_requested_raw := nullif(trim(coalesce(p_payload->>'cita_fecha_hora', p_payload->>'scheduled_at', '')), '');
  v_requested_at := public.parse_planespro_local_datetime(v_requested_raw, coalesce(v_context.timezone, 'America/Santiago'));

  IF v_requested_at IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_lead.user_id <> v_context.owner_user_id THEN
    RAISE EXCEPTION 'lead owner does not match booking owner';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.get_planespro_public_available_slots(
      coalesce(p_payload->>'capture_ref', p_payload->>'ref', v_lead.metadata->>'capture_ref'),
      coalesce(p_payload->>'source_channel', v_lead.metadata->>'source_channel', 'general'),
      (v_requested_at AT TIME ZONE coalesce(v_context.timezone, 'America/Santiago'))::date,
      1
    ) slot
    WHERE slot.disabled = false
      AND slot.starts_at = v_requested_at
  ) THEN
    RAISE EXCEPTION 'El bloque solicitado ya no esta disponible';
  END IF;

  INSERT INTO public.appointments (
    user_id,
    lead_id,
    start_time,
    end_time,
    status,
    timezone,
    source_system,
    source_channel,
    capture_link_id,
    capture_ref,
    appointment_duration_minutes,
    appointment_buffer_minutes,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    v_context.owner_user_id,
    p_lead_id,
    v_requested_at,
    v_requested_at + make_interval(mins => v_duration + v_buffer),
    coalesce(nullif(lower(trim(p_payload->>'cita_estado')), ''), 'pendiente'),
    coalesce(v_context.timezone, 'America/Santiago'),
    'planespro',
    v_context.source_channel,
    v_context.capture_link_id,
    v_context.capture_ref,
    v_duration,
    v_buffer,
    jsonb_build_object(
      'source_payload', p_payload,
      'capture_link_name', v_context.link_name,
      'capture_campaign', v_context.campaign_name
    ),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_appointment_id;

  UPDATE public.leads
  SET
    scheduled_at = v_requested_at,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'appointment_id', v_appointment_id,
        'appointment_status', coalesce(nullif(lower(trim(p_payload->>'cita_estado')), ''), 'pendiente')
      )
  WHERE id = p_lead_id;

  RETURN v_appointment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_planespro_public_lead(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := nullif(trim(coalesce(p_payload->>'name', p_payload->>'nombre', '')), '');
  v_phone text := nullif(trim(coalesce(p_payload->>'phone', p_payload->>'telefono', '')), '');
  v_email text := nullif(trim(coalesce(p_payload->>'email', p_payload->>'correo', '')), '');
  v_company text := nullif(trim(coalesce(p_payload->>'company', p_payload->>'empresa', '')), '');
  v_rut text := nullif(trim(coalesce(p_payload->>'rut', '')), '');
  v_notes text := nullif(trim(coalesce(
    p_payload->>'notes',
    p_payload->>'comentarios',
    p_payload->>'comentario',
    p_payload->>'message',
    p_payload->>'mensaje',
    ''
  )), '');
  v_capture_ref text := public.normalize_capture_ref(coalesce(p_payload->>'capture_ref', p_payload->>'ref', ''));
  v_first_touch_ref text := public.normalize_capture_ref(coalesce(p_payload->>'first_touch_ref', ''));
  v_contact_preference text := nullif(trim(coalesce(p_payload->>'contacto_preferencia', p_payload->>'contact_preference', '')), '');
  v_advisor_id text := nullif(trim(coalesce(p_payload->>'advisor_id', '')), '');
  v_pdf_path text := nullif(trim(coalesce(p_payload->>'pdf_path', p_payload->>'attachment_path', '')), '');
  v_appointment_raw text := nullif(trim(coalesce(p_payload->>'cita_fecha_hora', p_payload->>'scheduled_at', '')), '');
  v_appointment_at timestamptz;
  v_appointment_status text := nullif(trim(coalesce(p_payload->>'cita_estado', '')), '');
  v_source_channel_input text := lower(nullif(trim(coalesce(p_payload->>'source_channel', p_payload->>'form_channel', '')), ''));
  v_source_form_variant text := nullif(trim(coalesce(p_payload->>'source_form_variant', p_payload->>'form_variant', '')), '');
  v_source_hostname text := nullif(trim(coalesce(p_payload->>'source_hostname', p_payload->>'hostname', p_payload->>'host', '')), '');
  v_source_path text := nullif(trim(coalesce(p_payload->>'source_path', p_payload->>'page_path', p_payload->>'pathname', '')), '');
  v_source_url text := nullif(trim(coalesce(p_payload->>'source_url', p_payload->>'page_url', p_payload->>'url', '')), '');
  v_context record;
  v_lead_id uuid;
  v_appointment_id uuid;
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  IF v_phone IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'phone or email is required';
  END IF;

  SELECT *
  INTO v_context
  FROM public.resolve_planespro_booking_context(
    CASE
      WHEN coalesce(v_source_channel_input, '') = 'general' THEN NULL
      ELSE v_capture_ref
    END,
    CASE
      WHEN v_source_channel_input IN ('pb', 'general') THEN v_source_channel_input
      WHEN v_capture_ref IS NOT NULL THEN 'pb'
      WHEN coalesce(v_source_path, '') LIKE '/pb%' THEN 'pb'
      ELSE 'general'
    END
  )
  LIMIT 1;

  v_appointment_at := public.parse_planespro_local_datetime(v_appointment_raw, coalesce(v_context.timezone, 'America/Santiago'));

  INSERT INTO public.leads (
    user_id,
    name,
    phone,
    email,
    company,
    rut,
    status,
    notes,
    scheduled_at,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    v_context.owner_user_id,
    v_name,
    v_phone,
    v_email,
    v_company,
    v_rut,
    'nuevo',
    v_notes,
    v_appointment_at,
    nullif(trim(coalesce(p_payload->>'utm_source', '')), ''),
    nullif(trim(coalesce(p_payload->>'utm_medium', '')), ''),
    nullif(trim(coalesce(p_payload->>'utm_campaign', '')), ''),
    nullif(trim(coalesce(p_payload->>'utm_term', '')), ''),
    nullif(trim(coalesce(p_payload->>'utm_content', '')), ''),
    jsonb_build_object(
      'source_system', 'planespro',
      'source_channel', v_context.source_channel,
      'source_form_variant', v_source_form_variant,
      'source_hostname', v_source_hostname,
      'source_path', v_source_path,
      'source_url', v_source_url,
      'source_cta', nullif(trim(coalesce(p_payload->>'source_cta', p_payload->>'fuente_cta', '')), ''),
      'capture_ref', v_context.capture_ref,
      'first_touch_ref', v_first_touch_ref,
      'contact_preference', v_contact_preference,
      'advisor_id', v_advisor_id,
      'appointment_status', v_appointment_status,
      'pdf_path', v_pdf_path,
      'capture_link_id', v_context.capture_link_id,
      'capture_link_name', v_context.link_name,
      'capture_campaign', v_context.campaign_name,
      'raw_payload', p_payload
    ),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_lead_id;

  IF v_contact_preference = 'agendar_reunion' AND v_appointment_at IS NOT NULL THEN
    v_appointment_id := public.create_planespro_appointment_for_lead(v_lead_id, p_payload);
  END IF;

  RETURN jsonb_build_object(
    'lead_id', v_lead_id,
    'assigned_user_id', v_context.owner_user_id,
    'capture_link_id', v_context.capture_link_id,
    'source_channel', v_context.source_channel,
    'appointment_id', v_appointment_id,
    'status', 'created'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_planespro_booking_context(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_planespro_public_available_slots(text, text, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_planespro_appointment_for_lead(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_calendar_defaults(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.resolve_planespro_booking_context(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_planespro_public_available_slots(text, text, date, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_planespro_appointment_for_lead(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_calendar_defaults(uuid) TO authenticated;

COMMENT ON TABLE public.user_calendar_settings IS
'Configuracion de agenda por usuario para slots publicos, duracion y zona horaria.';

COMMENT ON TABLE public.user_calendar_connections IS
'Conexion Google Calendar administrada por backend. No debe exponerse directo a UI.';

COMMENT ON TABLE public.user_availability_blocks IS
'Bloqueos manuales o de sistema para disponibilidad por usuario.';

COMMENT ON FUNCTION public.get_planespro_public_available_slots(text, text, date, integer) IS
'Devuelve disponibilidad publica por capture_ref o canal general sin exponer datos privados del asesor.';

COMMENT ON FUNCTION public.create_planespro_appointment_for_lead(uuid, jsonb) IS
'Crea una cita asociada a un lead y bloquea el slot en Supabase.';

COMMENT ON FUNCTION public.submit_planespro_public_lead(jsonb) IS
'Recibe formularios generales y pb de planespro.cl, resuelve ownership y crea cita Supabase cuando corresponde.';

NOTIFY pgrst, 'reload schema';
