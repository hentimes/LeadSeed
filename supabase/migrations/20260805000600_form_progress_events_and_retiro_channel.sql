-- form_progress_events + canal retiro
--
-- Dos cosas independientes en esta migracion:
--
-- 1. Tabla generica de progreso de formularios publicos (visita, paso 1,
--    paso 2), reusable para pb/form/retiro y cualquier formulario futuro
--    sin necesitar otra migracion (el Edge Function valida los valores
--    permitidos de form_slug/event_type, no la base). Sin RLS policies:
--    solo el Edge Function form-progress (service role) escribe, y solo
--    list_my_capture_links (SECURITY DEFINER) lee.
--
-- 2. El formulario retiro-tecnico-extranjero mandaba source_channel:"form"
--    (invalido) y ownership caia por accidente: si traia ref, se resolvia
--    como canal 'pb' (bug latente: capture_links de retiro se creaban sin
--    distincion de tipo); si no traia ref, caia al owner por defecto
--    (email hardcodeado planespro.cl@gmail.com). Se agrega un canal
--    'retiro' explicito que siempre resuelve a un profile role='admin',
--    y capture_links.link_type para poder crear links de campana propios
--    de retiro sin que colisionen con la logica de pb.

-- ---------------------------------------------------------------------------
-- PARTE 1: tabla generica de progreso
-- ---------------------------------------------------------------------------
CREATE TABLE public.form_progress_events (
  id bigserial PRIMARY KEY,
  form_slug text NOT NULL,
  capture_ref text,
  event_type text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (form_slug, session_id, event_type)
);

CREATE INDEX form_progress_events_ref_idx
  ON public.form_progress_events (capture_ref)
  WHERE capture_ref IS NOT NULL;

ALTER TABLE public.form_progress_events ENABLE ROW LEVEL SECURITY;
-- Sin policies a proposito: anon/authenticated no tienen acceso directo.
-- El Edge Function form-progress usa la service role key (bypassa RLS) para
-- insertar, y list_my_capture_links (SECURITY DEFINER) para leer agregado.

REVOKE ALL ON public.form_progress_events FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- PARTE 2: capture_links.link_type
-- ---------------------------------------------------------------------------
ALTER TABLE public.capture_links
  ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'pb'
  CHECK (link_type IN ('pb', 'retiro'));

-- ---------------------------------------------------------------------------
-- PARTE 3: resolve_planespro_booking_context - agregar canal 'retiro'
-- ---------------------------------------------------------------------------
-- Cuerpo identico al desplegado en 20260601000107_fix_pb_ownership_and_appointment_rpc_surface.sql
-- (extraido de ese archivo, no reescrito de memoria), con 3 cambios puntuales
-- marcados con comentario: aceptar 'retiro', adoptar el link_type real del
-- capture_link resuelto en vez de forzar siempre 'pb', y un fallback a
-- role='admin' especifico para 'retiro' antes del fallback generico.
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
  v_capture_link_type text; -- nuevo: link_type del capture_link resuelto por ref
BEGIN
  -- Cambio 1: 'retiro' ahora es un canal explicito valido, igual que 'pb'/'general'.
  IF v_source_channel NOT IN ('pb', 'general', 'retiro') THEN
    v_source_channel := CASE WHEN v_capture_ref IS NOT NULL THEN 'pb' ELSE 'general' END;
  END IF;

  IF v_capture_ref IS NOT NULL THEN
    -- Cambio 2: se trae tambien el link_type y, si el canal declarado es
    -- 'retiro', el match solo cuenta si el link tambien es de tipo 'retiro'
    -- (defensa extra; ref_code ya es unico entre todos los tipos).
    SELECT cl.owner_user_id, cl.id, cl.label, cl.campaign_name, coalesce(cl.link_type, 'pb')
    INTO v_owner_user_id, v_capture_link_id, v_link_name, v_campaign_name, v_capture_link_type
    FROM public.capture_links cl
    WHERE cl.ref_code = v_capture_ref
      AND cl.is_active = true
      AND cl.deleted_at IS NULL
      AND (v_source_channel <> 'retiro' OR cl.link_type = 'retiro')
    LIMIT 1;

    IF v_owner_user_id IS NOT NULL THEN
      -- Antes: siempre forzaba 'pb'. Ahora adopta el tipo real del link
      -- encontrado, para no etiquetar un lead de retiro como 'pb'.
      v_source_channel := v_capture_link_type;
    END IF;
  END IF;

  -- Cambio 3: fallback especifico de 'retiro' antes del fallback generico
  -- por email hardcodeado. Garantiza "siempre admin" sin depender de que
  -- planespro.cl@gmail.com siga existiendo o siga siendo ese rol.
  IF v_owner_user_id IS NULL AND v_source_channel = 'retiro' THEN
    SELECT p.id
    INTO v_owner_user_id
    FROM public.profiles p
    WHERE p.role = 'admin'
    ORDER BY p.created_at
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
$function$;

-- ---------------------------------------------------------------------------
-- PARTE 4: submit_planespro_public_lead - reconocer canal 'retiro'
-- ---------------------------------------------------------------------------
-- Cuerpo identico al desplegado en 20260601000107_fix_pb_ownership_and_appointment_rpc_surface.sql
-- (submit_planespro_idempotent_public_lead, en 20260803000100, delega todo
-- aca via public.submit_planespro_public_lead(v_payload), asi que este es
-- el unico lugar que hace falta tocar). Unico cambio: el CASE que arma el
-- canal declarado ahora reconoce 'retiro' explicito y su path publico.
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

  SELECT *
  INTO v_context
  FROM public.resolve_planespro_booking_context(
    v_capture_ref,
    CASE
      -- Cambio: 'retiro' se reconoce como canal declarado igual que 'pb'/'general'.
      WHEN v_source_channel_input IN ('pb', 'general', 'retiro') THEN v_source_channel_input
      WHEN v_capture_ref IS NOT NULL THEN 'pb'
      WHEN coalesce(v_source_path, '') LIKE '/pb%' THEN 'pb'
      -- Cambio: fallback por path publico de retiro, espejo del de /pb.
      WHEN coalesce(v_source_path, '') LIKE '/retiro-tecnico-extranjero%' THEN 'retiro'
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

-- ---------------------------------------------------------------------------
-- PARTE 5: create_my_capture_link - permitir link_type, solo admin crea 'retiro'
-- ---------------------------------------------------------------------------
-- Signatura cambia (se agrega p_link_type al final): hay que dropear la
-- version vieja de 6 argumentos, si no PostgreSQL deja las dos coexistiendo
-- como overloads y una llamada con los 6 nombres de siempre queda ambigua.
DROP FUNCTION IF EXISTS public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean);

CREATE OR REPLACE FUNCTION public.create_my_capture_link(
  p_label text,
  p_campaign_name text DEFAULT NULL,
  p_ref_code text DEFAULT NULL,
  p_stats_config jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_is_default boolean DEFAULT false,
  p_link_type text DEFAULT 'pb'
)
RETURNS public.capture_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid := auth.uid();
  v_label text := nullif(trim(coalesce(p_label, '')), '');
  v_ref_code text := public.normalize_capture_ref(p_ref_code);
  v_is_default boolean := coalesce(p_is_default, false);
  v_link_type text := lower(nullif(trim(coalesce(p_link_type, 'pb')), ''));
  v_limit integer;
  v_current_count integer;
  v_link public.capture_links%ROWTYPE;
BEGIN
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;

  IF v_link_type NOT IN ('pb', 'retiro') THEN
    RAISE EXCEPTION 'invalid link_type';
  END IF;

  -- Solo admin puede crear links de tipo 'retiro'. Links 'pb' siguen igual
  -- que siempre (cualquier usuario autenticado, sujeto a su limite).
  IF v_link_type = 'retiro' AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_owner_user_id AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin role required to create retiro links';
  END IF;

  -- NULL de get_profile_capture_links_limit es "sin limite" (rol admin).
  v_limit := public.get_profile_capture_links_limit(v_owner_user_id);

  IF v_limit IS NOT NULL THEN
    SELECT count(*) INTO v_current_count
    FROM public.capture_links
    WHERE owner_user_id = v_owner_user_id
      AND deleted_at IS NULL;

    IF v_current_count >= v_limit THEN
      RAISE EXCEPTION 'capture link limit reached';
    END IF;
  END IF;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'label is required';
  END IF;

  IF v_ref_code IS NULL THEN
    v_ref_code := public.generate_capture_ref(v_label);
  END IF;

  -- El concepto de "link principal"/default es propio de pb (atribucion de
  -- ejecutivo). Los links de retiro nunca son default ni entran en esa
  -- promocion automatica del primer link del usuario.
  IF v_link_type = 'pb' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.capture_links cl
      WHERE cl.owner_user_id = v_owner_user_id
        AND cl.deleted_at IS NULL
        AND cl.link_type = 'pb'
        AND cl.is_default = true
    ) THEN
      v_is_default := true;
    END IF;

    IF v_is_default THEN
      UPDATE public.capture_links
      SET is_default = false,
          updated_at = timezone('utc'::text, now())
      WHERE owner_user_id = v_owner_user_id
        AND deleted_at IS NULL
        AND is_default = true;
    END IF;
  ELSE
    v_is_default := false;
  END IF;

  INSERT INTO public.capture_links (
    ref_code,
    label,
    owner_user_id,
    is_active,
    is_default,
    campaign_name,
    stats_config,
    metadata,
    link_type,
    created_at,
    updated_at
  )
  VALUES (
    v_ref_code,
    v_label,
    v_owner_user_id,
    true,
    v_is_default,
    nullif(trim(coalesce(p_campaign_name, '')), ''),
    coalesce(p_stats_config, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    v_link_type,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING * INTO v_link;

  RETURN v_link;
END;
$$;

REVOKE ALL ON FUNCTION public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean, text) IS
'Crea un link de publicacion propio respetando el limite de links definido en profiles.capture_links_limit. link_type=retiro requiere rol admin.';

-- ---------------------------------------------------------------------------
-- PARTE 6: list_my_capture_links - filtro por tipo + columnas de funnel
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.list_my_capture_links();

CREATE OR REPLACE FUNCTION public.list_my_capture_links(p_link_type text DEFAULT NULL)
RETURNS TABLE (
  id bigint,
  ref_code text,
  label text,
  campaign_name text,
  link_type text,
  is_default boolean,
  is_active boolean,
  stats_config jsonb,
  total_leads bigint,
  closed_leads bigint,
  close_rate_pct numeric,
  visits bigint,
  step1_completions bigint,
  step2_completions bigint,
  capture_links_limit integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH progress AS (
    SELECT
      fpe.capture_ref,
      count(*) FILTER (WHERE fpe.event_type = 'visit') AS visits,
      count(*) FILTER (WHERE fpe.event_type = 'step_1') AS step1_completions,
      count(*) FILTER (WHERE fpe.event_type = 'step_2') AS step2_completions
    FROM public.form_progress_events fpe
    GROUP BY fpe.capture_ref
  )
  SELECT
    cl.id,
    cl.ref_code,
    cl.label,
    cl.campaign_name,
    cl.link_type,
    cl.is_default,
    cl.is_active,
    cl.stats_config,
    coalesce(perf.total_leads, 0) AS total_leads,
    coalesce(perf.closed_leads, 0) AS closed_leads,
    coalesce(perf.close_rate_pct, 0) AS close_rate_pct,
    coalesce(progress.visits, 0) AS visits,
    coalesce(progress.step1_completions, 0) AS step1_completions,
    coalesce(progress.step2_completions, 0) AS step2_completions,
    public.get_profile_capture_links_limit(auth.uid()) AS capture_links_limit,
    cl.created_at,
    cl.updated_at
  FROM public.capture_links cl
  LEFT JOIN public.capture_link_performance perf
    ON perf.capture_link_id = cl.id
  LEFT JOIN progress
    ON progress.capture_ref = cl.ref_code
  WHERE cl.owner_user_id = auth.uid()
    AND cl.deleted_at IS NULL
    AND (p_link_type IS NULL OR cl.link_type = p_link_type)
  ORDER BY cl.is_default DESC, cl.created_at ASC, cl.id ASC;
$$;

REVOKE ALL ON FUNCTION public.list_my_capture_links(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_capture_links(text) TO authenticated;

COMMENT ON FUNCTION public.list_my_capture_links(text) IS
'Lista links de publicacion del usuario autenticado con contadores comerciales y de funnel (visitas/paso1/paso2) agregados. p_link_type filtra por pb/retiro; NULL trae todos.';

NOTIFY pgrst, 'reload schema';
