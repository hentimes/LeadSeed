CREATE TABLE IF NOT EXISTS public.planespro_form_abandonments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capture_link_id bigint REFERENCES public.capture_links(id) ON DELETE SET NULL,
  capture_ref text,
  first_touch_ref text,
  source_channel text NOT NULL DEFAULT 'general' CHECK (source_channel IN ('general', 'pb')),
  source_form_variant text,
  source_hostname text,
  source_path text,
  source_url text,
  source_cta text,
  campaign_name text,
  name text,
  phone text,
  email text,
  comuna text,
  region text,
  health_system text,
  health_provider text,
  contact_preference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.planespro_form_abandonments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS planespro_form_abandonments_owner_created_idx
ON public.planespro_form_abandonments (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS planespro_form_abandonments_capture_ref_idx
ON public.planespro_form_abandonments (capture_ref, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_planespro_public_abandonment(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := nullif(trim(coalesce(p_payload->>'name', p_payload->>'nombre', '')), '');
  v_phone text := nullif(trim(coalesce(p_payload->>'phone', p_payload->>'telefono', '')), '');
  v_email text := nullif(trim(coalesce(p_payload->>'email', p_payload->>'correo', '')), '');
  v_source_url text := nullif(trim(coalesce(p_payload->>'source_url', p_payload->>'page_url', p_payload->>'url', '')), '');
  v_capture_ref text := public.resolve_planespro_capture_ref_from_payload(p_payload);
  v_first_touch_ref_payload text := public.normalize_capture_ref(coalesce(p_payload->>'first_touch_ref', ''));
  v_first_touch_ref text;
  v_source_channel_input text := lower(nullif(trim(coalesce(p_payload->>'source_channel', p_payload->>'form_channel', '')), ''));
  v_source_form_variant text := nullif(trim(coalesce(p_payload->>'source_form_variant', p_payload->>'form_variant', '')), '');
  v_source_hostname text := nullif(trim(coalesce(p_payload->>'source_hostname', p_payload->>'hostname', p_payload->>'host', '')), '');
  v_source_path text := nullif(trim(coalesce(p_payload->>'source_path', p_payload->>'page_path', p_payload->>'pathname', '')), '');
  v_contact_preference text := nullif(trim(coalesce(p_payload->>'contacto_preferencia', p_payload->>'contact_preference', '')), '');
  v_context record;
  v_row_id uuid;
  v_effective_payload jsonb := coalesce(p_payload, '{}'::jsonb);
BEGIN
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

  INSERT INTO public.planespro_form_abandonments (
    owner_user_id,
    capture_link_id,
    capture_ref,
    first_touch_ref,
    source_channel,
    source_form_variant,
    source_hostname,
    source_path,
    source_url,
    source_cta,
    campaign_name,
    name,
    phone,
    email,
    comuna,
    region,
    health_system,
    health_provider,
    contact_preference,
    metadata
  )
  VALUES (
    v_context.owner_user_id,
    v_context.capture_link_id,
    v_context.capture_ref,
    v_first_touch_ref,
    v_context.source_channel,
    v_source_form_variant,
    v_source_hostname,
    v_source_path,
    v_source_url,
    nullif(trim(coalesce(p_payload->>'source_cta', p_payload->>'fuente_cta', '')), ''),
    nullif(trim(coalesce(p_payload->>'campana', p_payload->>'campaign_name', '')), ''),
    v_name,
    v_phone,
    v_email,
    nullif(trim(coalesce(p_payload->>'comuna', '')), ''),
    nullif(trim(coalesce(p_payload->>'region', '')), ''),
    nullif(trim(coalesce(p_payload->>'sistema_actual', p_payload->>'sistema', '')), ''),
    nullif(trim(coalesce(p_payload->>'isapre_especifica', p_payload->>'isapre', '')), ''),
    v_contact_preference,
    jsonb_build_object(
      'source_system', 'planespro',
      'raw_payload', v_effective_payload
    )
  )
  RETURNING id INTO v_row_id;

  RETURN jsonb_build_object(
    'abandonment_id', v_row_id,
    'assigned_user_id', v_context.owner_user_id,
    'capture_link_id', v_context.capture_link_id,
    'source_channel', v_context.source_channel,
    'status', 'recorded'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_planespro_public_abandonment(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_planespro_public_abandonment(jsonb) TO anon, authenticated;

COMMENT ON TABLE public.planespro_form_abandonments IS
'Registro de abandonos del formulario publico de PlanesPro ya migrado a Supabase, sin contaminar la bandeja principal de leads del CRM.';

COMMENT ON FUNCTION public.record_planespro_public_abandonment(jsonb) IS
'Registra abandonos del formulario publico preservando attribution comercial general/pb en Supabase.';
