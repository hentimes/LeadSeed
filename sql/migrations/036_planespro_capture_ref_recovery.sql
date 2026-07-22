CREATE OR REPLACE FUNCTION public.resolve_planespro_capture_ref_from_payload(
  p_payload jsonb,
  p_fallback_ref text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_payload_ref text := public.normalize_capture_ref(coalesce(p_payload->>'capture_ref', p_payload->>'ref', ''));
  v_source_url text := nullif(trim(coalesce(p_payload->>'source_url', p_payload->>'page_url', p_payload->>'url', '')), '');
  v_url_ref text := public.normalize_capture_ref(substring(coalesce(v_source_url, '') from '[?&]ref=([^&#]+)'));
  v_fallback_ref_normalized text := public.normalize_capture_ref(coalesce(p_fallback_ref, ''));
BEGIN
  IF v_payload_ref IS NOT NULL
     AND v_url_ref IS NOT NULL
     AND position(v_payload_ref in v_url_ref) = 1
     AND length(v_url_ref) > length(v_payload_ref) THEN
    RETURN v_url_ref;
  END IF;

  IF v_payload_ref IS NOT NULL THEN
    RETURN v_payload_ref;
  END IF;

  IF v_url_ref IS NOT NULL THEN
    RETURN v_url_ref;
  END IF;

  RETURN v_fallback_ref_normalized;
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
  v_capture_ref text;
  v_effective_payload jsonb := coalesce(p_payload, '{}'::jsonb);
BEGIN
  SELECT *
  INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead not found';
  END IF;

  v_capture_ref := public.resolve_planespro_capture_ref_from_payload(p_payload, v_lead.metadata->>'capture_ref');

  IF v_capture_ref IS NOT NULL THEN
    v_effective_payload := jsonb_set(v_effective_payload, '{capture_ref}', to_jsonb(v_capture_ref), true);
  END IF;

  SELECT *
  INTO v_context
  FROM public.resolve_planespro_booking_context(
    v_capture_ref,
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
      v_capture_ref,
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
      'source_payload', v_effective_payload,
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
  v_source_url text := nullif(trim(coalesce(p_payload->>'source_url', p_payload->>'page_url', p_payload->>'url', '')), '');
  v_capture_ref text := public.resolve_planespro_capture_ref_from_payload(p_payload);
  v_first_touch_ref_payload text := public.normalize_capture_ref(coalesce(p_payload->>'first_touch_ref', ''));
  v_first_touch_ref text;
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
  v_context record;
  v_lead_id uuid;
  v_appointment_id uuid;
  v_effective_payload jsonb := coalesce(p_payload, '{}'::jsonb);
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  IF v_phone IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'phone or email is required';
  END IF;

  v_first_touch_ref := CASE
    WHEN v_first_touch_ref_payload IS NOT NULL
      AND v_capture_ref IS NOT NULL
      AND position(v_first_touch_ref_payload in v_capture_ref) = 1
      AND length(v_capture_ref) > length(v_first_touch_ref_payload)
      THEN v_capture_ref
    ELSE coalesce(v_first_touch_ref_payload, v_capture_ref)
  END;

  IF v_capture_ref IS NOT NULL THEN
    v_effective_payload := jsonb_set(v_effective_payload, '{capture_ref}', to_jsonb(v_capture_ref), true);
  END IF;

  IF v_first_touch_ref IS NOT NULL THEN
    v_effective_payload := jsonb_set(v_effective_payload, '{first_touch_ref}', to_jsonb(v_first_touch_ref), true);
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
      'raw_payload', v_effective_payload
    ),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_lead_id;

  IF v_contact_preference = 'agendar_reunion' AND v_appointment_at IS NOT NULL THEN
    v_appointment_id := public.create_planespro_appointment_for_lead(v_lead_id, v_effective_payload);
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

COMMENT ON FUNCTION public.resolve_planespro_capture_ref_from_payload(jsonb, text) IS
'Recupera el capture_ref efectivo desde payload publico, source_url y fallback para tolerar clientes pb cacheados o truncados.';
