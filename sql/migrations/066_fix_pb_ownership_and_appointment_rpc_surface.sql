-- 066 - Ownership incorrecto de /pb + reducir superficie de la RPC de citas
--
-- Auditoria de seguridad, hallazgos altos restantes.
--
-- ---------------------------------------------------------------------------
-- PARTE 1: ownership de /pb
-- ---------------------------------------------------------------------------
-- Reproducido en produccion antes de este fix:
--   resolve_planespro_booking_context('xe8jdu', 'general') devolvia
--   owner_user_id = 7a005c66... (la cuenta por defecto planespro.cl@gmail.com)
--   en vez de 03b16aa2... (el dueño real del link 'xe8jdu').
--   Con el mismo ref y channel='pb' si resolvia al dueño correcto.
--
-- Causa: dos lugares descartaban el capture_ref cuando source_channel
-- llegaba como 'general', que es lo que mandan los assets viejos del
-- formulario aunque la pagina sea un /pb real con un ref valido en la URL:
--
--   1. submit_planespro_public_lead ponia el ref en NULL antes de llamar a
--      resolve_planespro_booking_context si el channel declarado era 'general'.
--   2. resolve_planespro_booking_context solo intentaba resolver el owner por
--      ref cuando el channel ya era 'pb', asi que aunque el ref hubiera
--      llegado bien, la busqueda ni se intentaba.
--
-- El ref es la señal fuerte (solo existe si corresponde a un capture_link
-- real); el channel es una señal blanda que puede quedar desactualizada en
-- un asset cacheado. Se invierte la precedencia: si el ref resuelve a un
-- capture_link activo, gana el ref y el channel se normaliza a 'pb', sin
-- importar que declaro el cliente. Si el ref no resuelve a nada, el
-- comportamiento previo se mantiene igual: cae al owner por defecto.
--
-- Ambas funciones se reproducen aca EXACTAS a como estan desplegadas en
-- produccion (extraidas con pg_get_functiondef), con un unico cambio
-- puntual marcado en un comentario dentro de cada una. No se reconstruyo
-- nada de memoria: una funcion SECURITY DEFINER que crea leads y citas en
-- produccion no se reescribe a partir de una lectura parcial.

CREATE OR REPLACE FUNCTION public.resolve_planespro_booking_context(p_capture_ref text DEFAULT NULL::text, p_source_channel text DEFAULT 'general'::text)
 RETURNS TABLE(owner_user_id uuid, capture_link_id bigint, capture_ref text, source_channel text, link_name text, campaign_name text, timezone text, slot_duration_minutes integer, slot_buffer_minutes integer, allow_public_booking boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Antes: exigia que el channel ya declarado fuera 'pb' para siquiera
  -- intentar resolver por ref (bug de ownership de /pb, migracion 066). El
  -- ref es la señal fuerte -solo existe si corresponde a un capture_link
  -- real-, el channel es una etiqueta que puede llegar desactualizada de un
  -- asset cacheado. Se intenta resolver por ref siempre que haya uno; si no
  -- encuentra nada, v_owner_user_id sigue null y cae al comportamiento
  -- previo (owner por defecto), sin cambios ahi.
  IF v_capture_ref IS NOT NULL THEN
    SELECT cl.owner_user_id, cl.id, cl.label, cl.campaign_name
    INTO v_owner_user_id, v_capture_link_id, v_link_name, v_campaign_name
    FROM public.capture_links cl
    WHERE cl.ref_code = v_capture_ref
      AND cl.is_active = true
      AND cl.deleted_at IS NULL
    LIMIT 1;

    IF v_owner_user_id IS NOT NULL THEN
      -- El ref resolvio a un link real: el origen es /pb sin importar que
      -- channel haya declarado el cliente.
      v_source_channel := 'pb';
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_planespro_public_lead(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_first_touch_ref text := v_capture_ref;
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

  IF v_capture_ref IS NOT NULL THEN
    v_effective_payload := jsonb_set(v_effective_payload, '{capture_ref}', to_jsonb(v_capture_ref), true);
    v_effective_payload := jsonb_set(v_effective_payload, '{first_touch_ref}', to_jsonb(v_capture_ref), true);
  END IF;

  -- Antes se pasaba NULL en vez de v_capture_ref cuando el channel
  -- declarado era 'general' (bug: /pb ownership incorrecto, migracion 066).
  -- resolve_planespro_booking_context ahora decide la precedencia: si el ref
  -- resuelve a un link real, gana el ref sin importar el channel declarado.
  SELECT *
  INTO v_context
  FROM public.resolve_planespro_booking_context(
    v_capture_ref,
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
$function$;

-- ---------------------------------------------------------------------------
-- PARTE 2: reducir la superficie de create_planespro_appointment_for_lead
-- ---------------------------------------------------------------------------
-- Hallazgo alto de la auditoria: la funcion tiene EXECUTE para anon y es
-- alcanzable como endpoint RPC directo, fuera del flujo de
-- submit_planespro_public_lead que es su unico consumidor real. No valida
-- auth.uid() en absoluto, solo se apoya en que el capture_ref y el slot
-- horario sean validos.
--
-- submit_planespro_public_lead la invoca desde dentro de su propio cuerpo
-- SECURITY DEFINER: la llamada interna corre como el dueño de la funcion
-- (postgres), que siempre tiene EXECUTE implicito sobre sus propias
-- funciones sin importar los grants de anon/authenticated. Revocar el
-- EXECUTE directo no rompe ese camino; solo cierra la posibilidad de
-- invocarla como endpoint HTTP suelto via PostgREST.
revoke execute on function public.create_planespro_appointment_for_lead(uuid, jsonb) from anon, authenticated;
