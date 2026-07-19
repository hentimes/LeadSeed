-- Query permanente
-- Dominio: planespro / capture links / self service
-- Objetivo: permitir gestion segura de links de publicacion por usuario sin exponer mutaciones directas desde UI

ALTER TABLE public.capture_links
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS capture_links_owner_active_not_deleted_idx
ON public.capture_links (owner_user_id, is_active, created_at DESC)
WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "Users can read own capture links" ON public.capture_links;
CREATE POLICY "Users can read own capture links"
ON public.capture_links
FOR SELECT
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own capture links" ON public.capture_links;
CREATE POLICY "Users can create own capture links"
ON public.capture_links
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own capture links" ON public.capture_links;
CREATE POLICY "Users can update own capture links"
ON public.capture_links
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.normalize_capture_ref(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    regexp_replace(
      lower(trim(coalesce(p_value, ''))),
      '[^a-z0-9_-]+',
      '-',
      'g'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_capture_ref(p_label text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_base text;
  v_candidate text;
BEGIN
  v_base := coalesce(public.normalize_capture_ref(p_label), 'link');

  LOOP
    v_candidate := left(v_base, 32) || '-' || lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    IF NOT EXISTS (
      SELECT 1
      FROM public.capture_links cl
      WHERE cl.ref_code = v_candidate
    ) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_profile_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_capture_links_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_limit := coalesce(public.get_profile_capture_links_limit(NEW.owner_user_id), 1);

  SELECT count(*)
  INTO v_count
  FROM public.capture_links cl
  WHERE cl.owner_user_id = NEW.owner_user_id
    AND cl.deleted_at IS NULL
    AND (TG_OP = 'INSERT' OR cl.id <> NEW.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'capture link limit reached for user %', NEW.owner_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_capture_links_limit_trg ON public.capture_links;
CREATE TRIGGER enforce_capture_links_limit_trg
BEFORE INSERT OR UPDATE OF owner_user_id, deleted_at ON public.capture_links
FOR EACH ROW
EXECUTE FUNCTION public.enforce_capture_links_limit();

INSERT INTO public.capture_links (
  ref_code,
  label,
  owner_user_id,
  is_active,
  is_default,
  campaign_name,
  stats_config,
  metadata,
  created_at,
  updated_at
)
SELECT
  'pp-' || replace(p.id::text, '-', '') AS ref_code,
  'Link principal' AS label,
  p.id AS owner_user_id,
  true AS is_active,
  true AS is_default,
  'General' AS campaign_name,
  '{}'::jsonb AS stats_config,
  jsonb_build_object('created_by_migration', '024_capture_links_management_rpcs') AS metadata,
  timezone('utc'::text, now()) AS created_at,
  timezone('utc'::text, now()) AS updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.capture_links cl
  WHERE cl.owner_user_id = p.id
    AND cl.deleted_at IS NULL
)
ON CONFLICT (ref_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.list_my_capture_links()
RETURNS TABLE (
  id bigint,
  ref_code text,
  label text,
  campaign_name text,
  is_default boolean,
  is_active boolean,
  stats_config jsonb,
  total_leads bigint,
  closed_leads bigint,
  close_rate_pct numeric,
  capture_links_limit integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cl.id,
    cl.ref_code,
    cl.label,
    cl.campaign_name,
    cl.is_default,
    cl.is_active,
    cl.stats_config,
    coalesce(perf.total_leads, 0) AS total_leads,
    coalesce(perf.closed_leads, 0) AS closed_leads,
    coalesce(perf.close_rate_pct, 0) AS close_rate_pct,
    public.get_profile_capture_links_limit(auth.uid()) AS capture_links_limit,
    cl.created_at,
    cl.updated_at
  FROM public.capture_links cl
  LEFT JOIN public.capture_link_performance perf
    ON perf.capture_link_id = cl.id
  WHERE cl.owner_user_id = auth.uid()
    AND cl.deleted_at IS NULL
  ORDER BY cl.is_default DESC, cl.created_at ASC, cl.id ASC;
$$;

CREATE OR REPLACE FUNCTION public.create_my_capture_link(
  p_label text,
  p_campaign_name text DEFAULT NULL,
  p_ref_code text DEFAULT NULL,
  p_stats_config jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_is_default boolean DEFAULT false
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
  v_link public.capture_links%ROWTYPE;
BEGIN
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'label is required';
  END IF;

  IF v_ref_code IS NULL THEN
    v_ref_code := public.generate_capture_ref(v_label);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.capture_links cl
    WHERE cl.owner_user_id = v_owner_user_id
      AND cl.deleted_at IS NULL
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

  INSERT INTO public.capture_links (
    ref_code,
    label,
    owner_user_id,
    is_active,
    is_default,
    campaign_name,
    stats_config,
    metadata,
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
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING * INTO v_link;

  RETURN v_link;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_capture_link(
  p_link_id bigint,
  p_label text DEFAULT NULL,
  p_campaign_name text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_stats_config jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_is_default boolean DEFAULT NULL
)
RETURNS public.capture_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid := auth.uid();
  v_link public.capture_links%ROWTYPE;
BEGIN
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;

  SELECT *
  INTO v_link
  FROM public.capture_links cl
  WHERE cl.id = p_link_id
    AND cl.owner_user_id = v_owner_user_id
    AND cl.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'capture link not found';
  END IF;

  IF v_link.is_default AND p_is_default = false THEN
    RAISE EXCEPTION 'default capture link cannot be unset directly';
  END IF;

  IF coalesce(p_is_default, false) AND p_is_active = false THEN
    RAISE EXCEPTION 'default capture link cannot be inactive';
  END IF;

  IF coalesce(p_is_default, false) THEN
    UPDATE public.capture_links
    SET is_default = false,
        updated_at = timezone('utc'::text, now())
    WHERE owner_user_id = v_owner_user_id
      AND id <> p_link_id
      AND deleted_at IS NULL
      AND is_default = true;
  END IF;

  IF v_link.is_default AND p_is_active = false THEN
    RAISE EXCEPTION 'default capture link cannot be deactivated';
  END IF;

  UPDATE public.capture_links
  SET
    label = coalesce(nullif(trim(coalesce(p_label, '')), ''), label),
    campaign_name = CASE
      WHEN p_campaign_name IS NULL THEN campaign_name
      ELSE nullif(trim(p_campaign_name), '')
    END,
    is_active = coalesce(p_is_active, is_active),
    is_default = CASE
      WHEN p_is_default IS NULL THEN is_default
      ELSE p_is_default
    END,
    stats_config = coalesce(p_stats_config, stats_config),
    metadata = coalesce(p_metadata, metadata),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_link_id
    AND owner_user_id = v_owner_user_id
    AND deleted_at IS NULL
  RETURNING * INTO v_link;

  RETURN v_link;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_my_capture_link(p_link_id bigint)
RETURNS public.capture_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid := auth.uid();
  v_link public.capture_links%ROWTYPE;
BEGIN
  SELECT *
  INTO v_link
  FROM public.capture_links cl
  WHERE cl.id = p_link_id
    AND cl.owner_user_id = v_owner_user_id
    AND cl.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'capture link not found';
  END IF;

  IF v_link.is_default THEN
    RAISE EXCEPTION 'default capture link cannot be deactivated';
  END IF;

  UPDATE public.capture_links
  SET is_active = false,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_link_id
  RETURNING * INTO v_link;

  RETURN v_link;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_capture_link_stats(p_link_id bigint DEFAULT NULL)
RETURNS TABLE (
  capture_link_id bigint,
  ref_code text,
  link_name text,
  campaign_name text,
  total_leads bigint,
  closed_leads bigint,
  close_rate_pct numeric,
  age_range text,
  income_range text,
  region text,
  health_system text,
  health_provider text,
  leads_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    clf.capture_link_id,
    clf.ref_code,
    clf.link_name,
    clf.campaign_name,
    perf.total_leads,
    perf.closed_leads,
    perf.close_rate_pct,
    nullif(clf.age_range, '') AS age_range,
    nullif(clf.income_range, '') AS income_range,
    nullif(clf.region, '') AS region,
    nullif(clf.health_system, '') AS health_system,
    nullif(clf.health_provider, '') AS health_provider,
    count(clf.lead_id) FILTER (WHERE clf.lead_id IS NOT NULL) AS leads_count
  FROM public.capture_link_lead_facts clf
  JOIN public.capture_link_performance perf
    ON perf.capture_link_id = clf.capture_link_id
  WHERE clf.owner_user_id = auth.uid()
    AND (p_link_id IS NULL OR clf.capture_link_id = p_link_id)
  GROUP BY
    clf.capture_link_id,
    clf.ref_code,
    clf.link_name,
    clf.campaign_name,
    perf.total_leads,
    perf.closed_leads,
    perf.close_rate_pct,
    nullif(clf.age_range, ''),
    nullif(clf.income_range, ''),
    nullif(clf.region, ''),
    nullif(clf.health_system, ''),
    nullif(clf.health_provider, '')
  ORDER BY clf.capture_link_id, leads_count DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_capture_links() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_my_capture_link(bigint, text, text, boolean, jsonb, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deactivate_my_capture_link(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_capture_link_stats(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_my_capture_links() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_capture_link(bigint, text, text, boolean, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_my_capture_link(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_capture_link_stats(bigint) TO authenticated;

COMMENT ON FUNCTION public.list_my_capture_links() IS
'Lista links de publicacion del usuario autenticado con contadores comerciales agregados.';

COMMENT ON FUNCTION public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean) IS
'Crea un link de publicacion propio respetando el limite de links definido en profiles.capture_links_limit.';

COMMENT ON FUNCTION public.update_my_capture_link(bigint, text, text, boolean, jsonb, jsonb, boolean) IS
'Actualiza nombre, campana, estado, configuracion estadistica y default de un link propio.';

COMMENT ON FUNCTION public.deactivate_my_capture_link(bigint) IS
'Desactiva un link propio no default sin borrar su historial analitico.';

COMMENT ON FUNCTION public.get_my_capture_link_stats(bigint) IS
'Devuelve cortes analiticos por link propio usando atributos reales capturados en leads.';

NOTIFY pgrst, 'reload schema';
