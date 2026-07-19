-- Query permanente
-- Dominio: agenda / invitaciones
-- Objetivo: invitar automaticamente al lead con email valido cuando se crea una cita

CREATE OR REPLACE FUNCTION public.ensure_lead_appointment_participant(
  p_appointment_id uuid,
  p_user_id uuid,
  p_lead_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_email text;
  v_name text;
BEGIN
  SELECT lead.id, lead.user_id, lead.name, lead.email
  INTO v_lead
  FROM public.leads lead
  WHERE lead.id = p_lead_id
    AND lead.user_id = p_user_id
    AND lead.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_email := lower(nullif(trim(coalesce(v_lead.email, '')), ''));
  v_name := nullif(trim(coalesce(v_lead.name, '')), '');

  IF v_email IS NULL OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.appointments appointment
    WHERE appointment.id = p_appointment_id
      AND appointment.user_id = p_user_id
      AND appointment.lead_id = p_lead_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.appointment_participants (
    appointment_id,
    user_id,
    email,
    name,
    participant_role,
    invitation_status,
    created_at,
    updated_at
  )
  VALUES (
    p_appointment_id,
    p_user_id,
    v_email,
    v_name,
    'lead',
    'pending',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (appointment_id, lower(email)) WHERE deleted_at IS NULL
  DO UPDATE SET
    name = coalesce(excluded.name, appointment_participants.name),
    participant_role = 'lead',
    invitation_status = 'pending',
    google_sync_error = NULL,
    google_synced_at = NULL,
    updated_at = timezone('utc'::text, now());
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_lead_appointment_participant(uuid, uuid, uuid) FROM PUBLIC;

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

  PERFORM public.ensure_lead_appointment_participant(v_appointment_id, v_context.owner_user_id, p_lead_id);

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

CREATE OR REPLACE FUNCTION public.create_my_appointment_from_lead(
  p_lead_id uuid,
  p_starts_at timestamptz,
  p_note text DEFAULT NULL
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
  meet_link text,
  google_event_id text,
  google_sync_status text,
  google_sync_error text,
  google_synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_lead record;
  v_settings record;
  v_duration integer;
  v_buffer integer;
  v_ends_at timestamptz;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_source_channel text;
  v_capture_ref text;
  v_capture_link_id bigint;
  v_conflict_exists boolean;
  v_active_lead_appointment_exists boolean;
  v_appointment_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= timezone('utc'::text, now()) THEN
    RAISE EXCEPTION 'appointment start must be in the future';
  END IF;

  SELECT *
  INTO v_lead
  FROM public.leads lead
  WHERE lead.id = p_lead_id
    AND lead.user_id = v_user_id
    AND lead.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead not found';
  END IF;

  PERFORM public.ensure_user_calendar_defaults(v_user_id);

  SELECT *
  INTO v_settings
  FROM public.user_calendar_settings settings
  WHERE settings.user_id = v_user_id;

  v_duration := coalesce(v_settings.slot_duration_minutes, 45);
  v_buffer := coalesce(v_settings.slot_buffer_minutes, 15);
  v_ends_at := p_starts_at + make_interval(mins => v_duration + v_buffer);
  v_source_channel := coalesce(nullif(v_lead.metadata->>'source_channel', ''), 'mensajes');
  v_capture_ref := nullif(v_lead.metadata->>'capture_ref', '');
  v_capture_link_id := CASE
    WHEN coalesce(v_lead.metadata->>'capture_link_id', '') ~ '^[0-9]+$'
      THEN (v_lead.metadata->>'capture_link_id')::bigint
    ELSE NULL
  END;

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments appointment
    WHERE appointment.lead_id = p_lead_id
      AND appointment.user_id = v_user_id
      AND appointment.status IN ('pendiente', 'agendada', 'confirmada', 'tentativa')
  )
  INTO v_active_lead_appointment_exists;

  IF v_active_lead_appointment_exists THEN
    RAISE EXCEPTION 'lead already has an active appointment';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments other_appointment
    WHERE other_appointment.user_id = v_user_id
      AND other_appointment.status IN ('pendiente', 'agendada', 'confirmada', 'tentativa')
      AND other_appointment.start_time < v_ends_at
      AND other_appointment.end_time > p_starts_at
    UNION ALL
    SELECT 1
    FROM public.user_availability_blocks block
    WHERE block.user_id = v_user_id
      AND block.starts_at < v_ends_at
      AND block.ends_at > p_starts_at
  )
  INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RAISE EXCEPTION 'El horario no esta disponible';
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
    notes,
    metadata,
    google_sync_status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_lead_id,
    p_starts_at,
    v_ends_at,
    'agendada',
    coalesce(v_settings.timezone, 'America/Santiago'),
    'mensajes',
    v_source_channel,
    v_capture_link_id,
    v_capture_ref,
    v_duration,
    v_buffer,
    v_note,
    jsonb_build_object(
      'created_from', 'lead_detail',
      'lead_metadata_source_channel', v_source_channel
    ),
    'pending',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING appointments.id INTO v_appointment_id;

  PERFORM public.ensure_lead_appointment_participant(v_appointment_id, v_user_id, p_lead_id);

  INSERT INTO public.appointment_audit_events (
    appointment_id,
    user_id,
    event_type,
    previous_status,
    next_status,
    next_start_time,
    next_end_time,
    note
  )
  VALUES (
    v_appointment_id,
    v_user_id,
    'created_from_lead',
    NULL,
    'agendada',
    p_starts_at,
    v_ends_at,
    'Cita creada desde detalle de lead'
  );

  UPDATE public.leads lead
  SET
    scheduled_at = p_starts_at,
    metadata = coalesce(lead.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'appointment_id', v_appointment_id,
        'appointment_status', 'agendada'
      ),
    updated_at = timezone('utc'::text, now())
  WHERE lead.id = p_lead_id
    AND lead.user_id = v_user_id;

  RETURN QUERY
  SELECT *
  FROM public.list_my_appointments((p_starts_at AT TIME ZONE coalesce(v_settings.timezone, 'America/Santiago'))::date, (p_starts_at AT TIME ZONE coalesce(v_settings.timezone, 'America/Santiago'))::date)
  WHERE list_my_appointments.id = v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_planespro_appointment_for_lead(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_my_appointment_from_lead(uuid, timestamptz, text) TO authenticated;

COMMENT ON FUNCTION public.ensure_lead_appointment_participant(uuid, uuid, uuid) IS
'Adds the appointment lead as a pending Calendar attendee when the lead has a valid email.';
