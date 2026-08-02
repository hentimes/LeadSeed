-- 069 - Origen del lead: manual, importado o formulario web
--
-- Feature pedida: poder filtrar leads por origen, y para los que vienen de
-- un formulario web, saber de que link/campaña especifico.
--
-- Los leads del formulario publico ya guardaban capture_link_name y
-- capture_campaign en metadata (via submit_planespro_public_lead), asi que
-- esa parte ya existia. Lo que faltaba era un campo unico y consistente
-- para distinguir origen en los tres casos, mas la marca en el propio
-- momento de creacion para los otros dos caminos (manual e importado, que
-- se resuelven en el cliente: leadsService.ts).
--
-- Se agrega metadata.origin con tres valores: 'manual', 'imported',
-- 'web_form'. Se reutiliza el signal ya existente (source_system =
-- 'planespro') para no depender de un backfill fragil en ese caso.
--
-- ---------------------------------------------------------------------------
-- Backfill: 1970 leads existentes no tenian ninguna señal de origen (ni
-- manual ni importado se marcaban antes de este cambio). Se clasifican
-- explicitamente ahora, en vez de dejar el filtro de 'manual' dependiendo
-- en tiempo de consulta de una exclusion sobre metadata ausente -evita
-- depender de como PostgREST traduce not.eq sobre columnas JSON nulas, que
-- no se pudo verificar empiricamente en este entorno-.
--
-- Es una clasificacion honesta, no perfecta: los leads importados antes de
-- este cambio no dejaron ninguna marca distinguible de los creados a mano,
-- asi que quedan bajo 'manual' por default. No hay forma de reconstruir
-- esa distincion retroactivamente sin una señal que nunca se guardo.
update public.leads
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'origin',
  case when metadata->>'source_system' = 'planespro' then 'web_form' else 'manual' end
)
where metadata->>'origin' is null;

-- ---------------------------------------------------------------------------
-- De aca en adelante: submit_planespro_public_lead marca origin=web_form en
-- cada lead nuevo del formulario publico. Cuerpo identico al desplegado
-- (extraido con pg_get_functiondef tras la migracion 066), con el unico
-- agregado de la linea 'origin', 'web_form' dentro del metadata.
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
      'origin', 'web_form',
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
