-- Query permanente
-- Dominio: planespro / forms / ownership
-- Objetivo: distinguir formulario general vs formularios pb y respetar ownership por ultimo toque real

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
  v_capture_ref text := nullif(trim(coalesce(p_payload->>'capture_ref', p_payload->>'ref', '')), '');
  v_first_touch_ref text := nullif(trim(coalesce(p_payload->>'first_touch_ref', '')), '');
  v_contact_preference text := nullif(trim(coalesce(p_payload->>'contacto_preferencia', p_payload->>'contact_preference', '')), '');
  v_advisor_id text := nullif(trim(coalesce(p_payload->>'advisor_id', '')), '');
  v_pdf_path text := nullif(trim(coalesce(p_payload->>'pdf_path', p_payload->>'attachment_path', '')), '');
  v_appointment_at timestamptz := nullif(trim(coalesce(p_payload->>'cita_fecha_hora', p_payload->>'scheduled_at', '')), '')::timestamptz;
  v_appointment_status text := nullif(trim(coalesce(p_payload->>'cita_estado', '')), '');
  v_source_channel_input text := lower(nullif(trim(coalesce(p_payload->>'source_channel', p_payload->>'form_channel', '')), ''));
  v_source_form_variant text := nullif(trim(coalesce(p_payload->>'source_form_variant', p_payload->>'form_variant', '')), '');
  v_source_hostname text := nullif(trim(coalesce(p_payload->>'source_hostname', p_payload->>'hostname', p_payload->>'host', '')), '');
  v_source_path text := nullif(trim(coalesce(p_payload->>'source_path', p_payload->>'page_path', p_payload->>'pathname', '')), '');
  v_source_url text := nullif(trim(coalesce(p_payload->>'source_url', p_payload->>'page_url', p_payload->>'url', '')), '');
  v_effective_channel text;
  v_owner_user_id uuid;
  v_lead_id uuid;
  v_capture_link_id bigint;
  v_capture_link_name text;
  v_capture_link_campaign text;
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  IF v_phone IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'phone or email is required';
  END IF;

  v_effective_channel := CASE
    WHEN v_source_channel_input IN ('pb', 'general') THEN v_source_channel_input
    WHEN v_capture_ref IS NOT NULL THEN 'pb'
    WHEN coalesce(v_source_path, '') LIKE '/pb%' THEN 'pb'
    ELSE 'general'
  END;

  IF v_effective_channel = 'pb' THEN
    SELECT cl.owner_user_id, cl.id, cl.label, cl.campaign_name
    INTO v_owner_user_id, v_capture_link_id, v_capture_link_name, v_capture_link_campaign
    FROM public.capture_links cl
    WHERE cl.is_active = true
      AND cl.ref_code = v_capture_ref
    LIMIT 1;

    IF v_owner_user_id IS NULL THEN
      SELECT cl.owner_user_id, cl.id, cl.label, cl.campaign_name
      INTO v_owner_user_id, v_capture_link_id, v_capture_link_name, v_capture_link_campaign
      FROM public.capture_links cl
      WHERE cl.is_active = true
        AND cl.ref_code = v_first_touch_ref
      LIMIT 1;
    END IF;
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
    RAISE EXCEPTION 'no admin profile available to receive public lead';
  END IF;

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
    v_owner_user_id,
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
      'source_channel', v_effective_channel,
      'source_form_variant', v_source_form_variant,
      'source_hostname', v_source_hostname,
      'source_path', v_source_path,
      'source_url', v_source_url,
      'capture_ref', v_capture_ref,
      'first_touch_ref', v_first_touch_ref,
      'contact_preference', v_contact_preference,
      'advisor_id', v_advisor_id,
      'appointment_status', v_appointment_status,
      'pdf_path', v_pdf_path,
      'capture_link_id', v_capture_link_id,
      'capture_link_name', v_capture_link_name,
      'capture_campaign', v_capture_link_campaign,
      'raw_payload', p_payload
    ),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object(
    'lead_id', v_lead_id,
    'assigned_user_id', v_owner_user_id,
    'capture_link_id', v_capture_link_id,
    'source_channel', v_effective_channel,
    'status', 'created'
  );
END;
$$;

COMMENT ON FUNCTION public.submit_planespro_public_lead(jsonb) IS
'Recibe formularios generales y pb de planespro.cl, distingue el canal y resuelve ownership por ultimo toque real.';

NOTIFY pgrst, 'reload schema';
