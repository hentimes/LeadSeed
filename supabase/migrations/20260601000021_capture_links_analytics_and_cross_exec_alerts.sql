-- Query permanente
-- Dominio: planespro / capture links / lead analytics / cross-exec alerts
-- Objetivo: endurecer capture_links, permitir analitica por link y registrar alertas cruzadas por multi-captura

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS capture_links_limit integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS cross_exec_lead_alerts boolean DEFAULT true;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_capture_links_limit_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_capture_links_limit_check
CHECK (capture_links_limit BETWEEN 1 AND 5);

ALTER TABLE public.capture_links
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS campaign_name text,
ADD COLUMN IF NOT EXISTS stats_config jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS capture_links_owner_user_id_active_idx
ON public.capture_links (owner_user_id, is_active, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS capture_links_one_default_per_owner_idx
ON public.capture_links (owner_user_id)
WHERE is_default = true;

WITH first_links AS (
  SELECT DISTINCT ON (owner_user_id)
    id,
    owner_user_id
  FROM public.capture_links
  ORDER BY owner_user_id, created_at ASC, id ASC
)
UPDATE public.capture_links cl
SET is_default = true
FROM first_links fl
WHERE cl.id = fl.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.capture_links existing_default
    WHERE existing_default.owner_user_id = fl.owner_user_id
      AND existing_default.is_default = true
  );

CREATE TABLE IF NOT EXISTS public.lead_cross_exec_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  related_lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  counterpart_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_kind text NOT NULL CHECK (event_kind IN ('captured_previously', 'contacted_other_executive')),
  counterpart_captured_at timestamptz NOT NULL,
  matched_by text[] NOT NULL DEFAULT '{}'::text[],
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_cross_exec_events_unique_idx
ON public.lead_cross_exec_events (lead_id, related_lead_id, owner_user_id, event_kind);

CREATE INDEX IF NOT EXISTS lead_cross_exec_events_owner_unread_idx
ON public.lead_cross_exec_events (owner_user_id, is_read, created_at DESC);

ALTER TABLE public.lead_cross_exec_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own cross exec events" ON public.lead_cross_exec_events;
CREATE POLICY "Users can read own cross exec events"
ON public.lead_cross_exec_events
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Users can update own cross exec events" ON public.lead_cross_exec_events;
CREATE POLICY "Users can update own cross exec events"
ON public.lead_cross_exec_events
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.normalize_lead_phone(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(regexp_replace(lower(trim(coalesce(p_value, ''))), '[^0-9]+', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_lead_email(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(lower(trim(coalesce(p_value, ''))), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_lead_rut(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(regexp_replace(lower(trim(coalesce(p_value, ''))), '[^0-9k]+', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.is_lead_effectively_closed(p_status text, p_closed_at timestamptz)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_closed_at IS NOT NULL
    OR lower(coalesce(p_status, '')) IN ('convertido', 'cerrado', 'closed');
$$;

CREATE OR REPLACE FUNCTION public.get_profile_capture_links_limit(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT least(greatest(coalesce(p.capture_links_limit, 1), 1), 5)
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.enforce_capture_links_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  v_limit := coalesce(public.get_profile_capture_links_limit(NEW.owner_user_id), 1);

  SELECT count(*)
  INTO v_count
  FROM public.capture_links cl
  WHERE cl.owner_user_id = NEW.owner_user_id
    AND (TG_OP = 'INSERT' OR cl.id <> NEW.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'capture link limit reached for user %', NEW.owner_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_capture_links_limit_trg ON public.capture_links;
CREATE TRIGGER enforce_capture_links_limit_trg
BEFORE INSERT ON public.capture_links
FOR EACH ROW
EXECUTE FUNCTION public.enforce_capture_links_limit();

CREATE OR REPLACE FUNCTION public.rebuild_lead_cross_exec_events(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_prior public.leads%ROWTYPE;
  v_phone text;
  v_email text;
  v_rut text;
  v_prior_phone text;
  v_prior_email text;
  v_prior_rut text;
  v_matched_by text[] := '{}'::text[];
  v_current_alerts boolean := true;
  v_prior_alerts boolean := true;
BEGIN
  SELECT *
  INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM public.lead_cross_exec_events
  WHERE lead_id = p_lead_id
     OR related_lead_id = p_lead_id;

  IF v_lead.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;

  v_phone := public.normalize_lead_phone(v_lead.phone);
  v_email := public.normalize_lead_email(v_lead.email);
  v_rut := public.normalize_lead_rut(v_lead.rut);

  IF v_phone IS NULL AND v_email IS NULL AND v_rut IS NULL THEN
    RETURN;
  END IF;

  SELECT l.*
  INTO v_prior
  FROM public.leads l
  WHERE l.id <> v_lead.id
    AND l.user_id <> v_lead.user_id
    AND l.deleted_at IS NULL
    AND (
      (v_phone IS NOT NULL AND public.normalize_lead_phone(l.phone) = v_phone)
      OR (v_email IS NOT NULL AND public.normalize_lead_email(l.email) = v_email)
      OR (v_rut IS NOT NULL AND public.normalize_lead_rut(l.rut) = v_rut)
    )
  ORDER BY l.created_at DESC, l.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_prior_phone := public.normalize_lead_phone(v_prior.phone);
  v_prior_email := public.normalize_lead_email(v_prior.email);
  v_prior_rut := public.normalize_lead_rut(v_prior.rut);

  IF v_phone IS NOT NULL AND v_phone = v_prior_phone THEN
    v_matched_by := array_append(v_matched_by, 'phone');
  END IF;

  IF v_email IS NOT NULL AND v_email = v_prior_email THEN
    v_matched_by := array_append(v_matched_by, 'email');
  END IF;

  IF v_rut IS NOT NULL AND v_rut = v_prior_rut THEN
    v_matched_by := array_append(v_matched_by, 'rut');
  END IF;

  SELECT coalesce(p.cross_exec_lead_alerts, true)
  INTO v_current_alerts
  FROM public.profiles p
  WHERE p.id = v_lead.user_id;

  SELECT coalesce(p.cross_exec_lead_alerts, true)
  INTO v_prior_alerts
  FROM public.profiles p
  WHERE p.id = v_prior.user_id;

  IF coalesce(v_current_alerts, true) AND coalesce(v_prior_alerts, true) THEN
    INSERT INTO public.lead_cross_exec_events (
      lead_id,
      related_lead_id,
      owner_user_id,
      counterpart_user_id,
      event_kind,
      counterpart_captured_at,
      matched_by,
      metadata
    )
    VALUES (
      v_lead.id,
      v_prior.id,
      v_lead.user_id,
      v_prior.user_id,
      'captured_previously',
      v_prior.created_at,
      v_matched_by,
      jsonb_build_object(
        'message_key', 'lead_captured_previously',
        'privacy_mode', 'counterpart_hidden'
      )
    )
    ON CONFLICT (lead_id, related_lead_id, owner_user_id, event_kind)
    DO UPDATE SET
      counterpart_captured_at = excluded.counterpart_captured_at,
      matched_by = excluded.matched_by,
      metadata = excluded.metadata,
      is_read = false,
      read_at = null,
      created_at = timezone('utc'::text, now());

    INSERT INTO public.lead_cross_exec_events (
      lead_id,
      related_lead_id,
      owner_user_id,
      counterpart_user_id,
      event_kind,
      counterpart_captured_at,
      matched_by,
      metadata
    )
    VALUES (
      v_prior.id,
      v_lead.id,
      v_prior.user_id,
      v_lead.user_id,
      'contacted_other_executive',
      v_lead.created_at,
      v_matched_by,
      jsonb_build_object(
        'message_key', 'lead_contacted_other_executive',
        'privacy_mode', 'counterpart_hidden'
      )
    )
    ON CONFLICT (lead_id, related_lead_id, owner_user_id, event_kind)
    DO UPDATE SET
      counterpart_captured_at = excluded.counterpart_captured_at,
      matched_by = excluded.matched_by,
      metadata = excluded.metadata,
      is_read = false,
      read_at = null,
      created_at = timezone('utc'::text, now());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_lead_cross_exec_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rebuild_lead_cross_exec_events(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_cross_exec_sync_trg ON public.leads;
CREATE TRIGGER lead_cross_exec_sync_trg
AFTER INSERT OR UPDATE OF phone, email, rut, user_id, deleted_at ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_lead_cross_exec_sync();

CREATE OR REPLACE VIEW public.capture_link_lead_facts AS
SELECT
  cl.id AS capture_link_id,
  cl.owner_user_id,
  cl.ref_code,
  cl.label AS link_name,
  cl.campaign_name,
  cl.is_default,
  cl.is_active,
  l.id AS lead_id,
  l.user_id AS lead_owner_user_id,
  l.status,
  l.closed_at,
  public.is_lead_effectively_closed(l.status, l.closed_at) AS is_closed,
  l.created_at AS lead_created_at,
  coalesce(l.metadata->>'capture_ref', '') AS capture_ref,
  coalesce(l.metadata->>'first_touch_ref', '') AS first_touch_ref,
  coalesce(
    l.metadata->'raw_payload'->>'rango_edad',
    l.metadata->'raw_payload'->>'edad',
    ''
  ) AS age_range,
  coalesce(
    l.metadata->'raw_payload'->>'rango_renta',
    l.metadata->'raw_payload'->>'renta',
    ''
  ) AS income_range,
  coalesce(l.metadata->'raw_payload'->>'region', '') AS region,
  coalesce(
    l.metadata->'raw_payload'->>'sistema_actual',
    l.metadata->'raw_payload'->>'sistema',
    ''
  ) AS health_system,
  coalesce(
    l.metadata->'raw_payload'->>'isapre_especifica',
    l.metadata->'raw_payload'->>'isapre',
    ''
  ) AS health_provider
FROM public.capture_links cl
LEFT JOIN public.leads l
  ON l.metadata->>'capture_link_id' = cl.id::text
  OR l.metadata->>'capture_ref' = cl.ref_code;

CREATE OR REPLACE VIEW public.capture_link_performance AS
SELECT
  clf.capture_link_id,
  clf.owner_user_id,
  clf.ref_code,
  clf.link_name,
  clf.campaign_name,
  clf.is_default,
  clf.is_active,
  count(clf.lead_id) FILTER (WHERE clf.lead_id IS NOT NULL) AS total_leads,
  count(clf.lead_id) FILTER (WHERE clf.is_closed) AS closed_leads,
  CASE
    WHEN count(clf.lead_id) FILTER (WHERE clf.lead_id IS NOT NULL) = 0 THEN 0
    ELSE round(
      (
        count(clf.lead_id) FILTER (WHERE clf.is_closed)::numeric
        / count(clf.lead_id) FILTER (WHERE clf.lead_id IS NOT NULL)::numeric
      ) * 100,
      2
    )
  END AS close_rate_pct
FROM public.capture_link_lead_facts clf
GROUP BY
  clf.capture_link_id,
  clf.owner_user_id,
  clf.ref_code,
  clf.link_name,
  clf.campaign_name,
  clf.is_default,
  clf.is_active;

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
    'status', 'created'
  );
END;
$$;

COMMENT ON FUNCTION public.submit_planespro_public_lead(jsonb) IS
'Recibe un payload publico de planespro.cl, resuelve ownership por ultimo touch y guarda metadatos analiticos del capture link.';

COMMENT ON VIEW public.capture_link_lead_facts IS
'Vista de hechos por link para analitica de edad, renta, region y sistema de salud sin duplicar contadores manuales.';

COMMENT ON VIEW public.capture_link_performance IS
'Resumen por capture link con leads totales, leads cerrados y porcentaje de cierre.';

NOTIFY pgrst, 'reload schema';
