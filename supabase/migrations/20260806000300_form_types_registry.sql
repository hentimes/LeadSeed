-- form_types_registry
--
-- Generaliza "tipo de capture link" de un CHECK constraint hardcodeado
-- (IN ('pb','retiro')) a una tabla registro que el admin puede editar desde
-- la UI, sin migracion nueva cada vez que se agregue un formulario publico
-- distinto (hoy ya existe /form/<ref>, desplegado y funcionando en
-- landing-gerow, pero sin forma de crear links para el porque el check
-- constraint lo bloquea).
--
-- Decisiones del usuario para este trabajo:
-- 1. Unificacion completa: pb y retiro pasan a ser filas sembradas de esta
--    tabla, dejan de ser casos especiales hardcodeados en el codigo.
-- 2. Permiso configurable por tipo: cada form_type dice si cualquier
--    usuario autenticado puede crear links de ese tipo (pb hoy) o si es
--    admin-only (retiro hoy), como un dato en vez de un string comparado a
--    mano en cada RPC.
--
-- Orden dentro de este archivo (importa): tabla + RLS -> seed de pb/retiro
-- -> conversion del CHECK a FK (las filas ya sembradas hacen que la FK se
-- valide sola, sin backfill) -> RPCs de form_types -> generalizacion de
-- create_my_capture_link y resolve_planespro_booking_context.

-- ---------------------------------------------------------------------------
-- PARTE 1: tabla form_types
-- ---------------------------------------------------------------------------
CREATE TABLE public.form_types (
  slug text PRIMARY KEY,
  display_name text NOT NULL,
  url_template text NOT NULL, -- patron con {ref}, ej. 'https://planespro.cl/pb/{ref}'
  links_admin_only boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.form_types ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado ve los tipos activos (los necesita para renderizar
-- su seccion de Links); el admin ve tambien los inactivos para poder
-- reactivarlos/editarlos.
CREATE POLICY "Authenticated read active form types, admin reads all"
ON public.form_types
FOR SELECT
USING (
  is_active = true
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Escritura directa a la tabla: solo admin. En la practica se usa via las
-- RPCs SECURITY DEFINER de abajo, esto es defensa en profundidad.
CREATE POLICY "Admins manage form types"
ON public.form_types
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------------------------------------------------------------------------
-- PARTE 2: seed de pb y retiro (deben existir antes de la FK del paso 3)
-- ---------------------------------------------------------------------------
INSERT INTO public.form_types (slug, display_name, url_template, links_admin_only, is_active)
VALUES
  ('pb', 'Booking PlanesPro', 'https://planespro.cl/pb/{ref}', false, true),
  ('retiro', 'Retiro tecnico extranjero', 'https://planespro.cl/retiro-tecnico-extranjero/{ref}/', true, true),
  ('form', 'Formulario simplificado', 'https://planespro.cl/form/{ref}', false, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- PARTE 3: capture_links.link_type - CHECK constraint -> FK a form_types
-- ---------------------------------------------------------------------------
-- Todas las filas existentes ya son 'pb' o 'retiro' (unicos valores que el
-- CHECK anterior permitia), y ambos ya fueron sembrados arriba, asi que la
-- FK se valida sola sin backfill ni ventana de downtime.
ALTER TABLE public.capture_links DROP CONSTRAINT IF EXISTS capture_links_link_type_check;
ALTER TABLE public.capture_links
  ADD CONSTRAINT capture_links_link_type_fkey
  FOREIGN KEY (link_type) REFERENCES public.form_types(slug);

-- form_progress_events.form_slug NO lleva FK a proposito: un evento de
-- progreso puede llegar antes de que exista un link de ese tipo (el Edge
-- Function valida form_slug contra su propio allowlist, no contra la base -
-- ver comentario original en 090_form_progress_events_and_retiro_channel.sql),
-- y un form_slug sin match simplemente no suma a ningun funnel (092 ya
-- documenta esto). No tocar.

-- ---------------------------------------------------------------------------
-- PARTE 4: RPCs de form_types
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_form_types()
RETURNS SETOF public.form_types
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.form_types
  WHERE is_active = true
     OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ORDER BY created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_form_types() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_form_types() TO authenticated;

COMMENT ON FUNCTION public.list_form_types() IS
'Lista tipos de formulario activos; el admin ve tambien los inactivos.';

CREATE OR REPLACE FUNCTION public.create_form_type(
  p_slug text,
  p_display_name text,
  p_url_template text,
  p_links_admin_only boolean DEFAULT true
)
RETURNS public.form_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := nullif(
    regexp_replace(lower(trim(coalesce(p_slug, ''))), '[^a-z0-9_-]+', '-', 'g'),
    ''
  );
  v_display_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_url_template text := nullif(trim(coalesce(p_url_template, '')), '');
  v_row public.form_types%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'admin role required to create form types';
  END IF;

  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'slug is required';
  END IF;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'display_name is required';
  END IF;

  IF v_url_template IS NULL OR v_url_template NOT LIKE '%{ref}%' THEN
    RAISE EXCEPTION 'url_template must contain the {ref} placeholder';
  END IF;

  INSERT INTO public.form_types (slug, display_name, url_template, links_admin_only, created_by)
  VALUES (v_slug, v_display_name, v_url_template, coalesce(p_links_admin_only, true), auth.uid())
  ON CONFLICT (slug) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.slug IS NULL THEN
    RAISE EXCEPTION 'form_type already exists: %', v_slug;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_form_type(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_form_type(text, text, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.create_form_type(text, text, text, boolean) IS
'Registra un tipo de formulario nuevo (admin-only). links_admin_only decide si solo el admin puede crear links de ese tipo.';

CREATE OR REPLACE FUNCTION public.update_form_type(
  p_slug text,
  p_display_name text DEFAULT NULL,
  p_url_template text DEFAULT NULL,
  p_links_admin_only boolean DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS public.form_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.form_types%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'admin role required to update form types';
  END IF;

  IF p_url_template IS NOT NULL AND p_url_template NOT LIKE '%{ref}%' THEN
    RAISE EXCEPTION 'url_template must contain the {ref} placeholder';
  END IF;

  UPDATE public.form_types
  SET display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      url_template = coalesce(nullif(trim(p_url_template), ''), url_template),
      links_admin_only = coalesce(p_links_admin_only, links_admin_only),
      is_active = coalesce(p_is_active, is_active),
      updated_at = timezone('utc'::text, now())
  WHERE slug = p_slug
  RETURNING * INTO v_row;

  IF v_row.slug IS NULL THEN
    RAISE EXCEPTION 'form_type not found: %', p_slug;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_form_type(text, text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_form_type(text, text, text, boolean, boolean) TO authenticated;

COMMENT ON FUNCTION public.update_form_type(text, text, text, boolean, boolean) IS
'Actualiza un tipo de formulario existente (admin-only). Parametros NULL no modifican su campo.';

-- ---------------------------------------------------------------------------
-- PARTE 5: create_my_capture_link - validar contra form_types en vez de
-- una lista hardcodeada de strings
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_my_capture_link(text, text, text, jsonb, jsonb, boolean, text);

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
  v_form_type public.form_types%ROWTYPE;
  v_limit integer;
  v_current_count integer;
  v_link public.capture_links%ROWTYPE;
BEGIN
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;

  -- Cambio: en vez de IN ('pb','retiro') hardcodeado, se valida contra la
  -- tabla form_types (Parte 1). Cualquier tipo activo registrado ahi
  -- funciona sin tocar esta funcion de nuevo.
  SELECT * INTO v_form_type FROM public.form_types WHERE slug = v_link_type AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid link_type';
  END IF;

  -- Cambio: el gate de admin ahora lee form_types.links_admin_only en vez
  -- de comparar el string 'retiro' a mano.
  IF v_form_type.links_admin_only AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_owner_user_id AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin role required to create % links', v_link_type;
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

  -- Cambio: "link principal"/default se generaliza a cualquier tipo abierto
  -- a todos los usuarios (antes: solo si v_link_type = 'pb'). Un tipo
  -- admin-only (retiro hoy, cualquier tipo nuevo por defecto) nunca es
  -- default, igual que antes.
  IF NOT v_form_type.links_admin_only THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.capture_links cl
      WHERE cl.owner_user_id = v_owner_user_id
        AND cl.deleted_at IS NULL
        AND cl.link_type = v_link_type
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
        AND link_type = v_link_type
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
'Crea un link de publicacion propio respetando el limite de links definido en profiles.capture_links_limit. El link_type debe existir y estar activo en form_types; si form_types.links_admin_only es true, requiere rol admin.';

-- ---------------------------------------------------------------------------
-- PARTE 6: resolve_planespro_booking_context - quitar el guard especifico
-- de 'retiro' (redundante: ref_code ya es UNIQUE) para que cualquier tipo
-- nuevo registrado en form_types resuelva igual que pb/retiro hoy
-- ---------------------------------------------------------------------------
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
  v_capture_link_type text;
BEGIN
  -- 'retiro' sigue siendo un canal explicito valido igual que 'pb'/'general'.
  -- Cualquier otro valor declarado (ej. 'form') se descarta aca, pero mas
  -- abajo, si hay ref y matchea un capture_link real, se adopta su
  -- link_type real de todas formas (Cambio 2) - asi que esta normalizacion
  -- inicial solo importa cuando NO hay ref para confirmar contra la base.
  IF v_source_channel NOT IN ('pb', 'general', 'retiro') THEN
    v_source_channel := CASE WHEN v_capture_ref IS NOT NULL THEN 'pb' ELSE 'general' END;
  END IF;

  IF v_capture_ref IS NOT NULL THEN
    -- Cambio: se quita el guard "AND (v_source_channel <> 'retiro' OR
    -- cl.link_type = 'retiro')" que tenia esta consulta desde
    -- 090_form_progress_events_and_retiro_channel.sql. Era redundante
    -- (ref_code es UNIQUE desde 020_planespro_public_capture.sql, un ref de
    -- tipo 'retiro' no puede matchear otro tipo) y ademas bloquearia que un
    -- ref de un tipo nuevo (ej. 'form') resuelva si el canal normalizado
    -- arriba cayo en 'pb' por default.
    SELECT cl.owner_user_id, cl.id, cl.label, cl.campaign_name, coalesce(cl.link_type, 'pb')
    INTO v_owner_user_id, v_capture_link_id, v_link_name, v_campaign_name, v_capture_link_type
    FROM public.capture_links cl
    WHERE cl.ref_code = v_capture_ref
      AND cl.is_active = true
      AND cl.deleted_at IS NULL
    LIMIT 1;

    IF v_owner_user_id IS NOT NULL THEN
      -- Adopta el tipo real del link encontrado, sea cual sea (pb, retiro,
      -- form, o cualquier tipo futuro registrado en form_types).
      v_source_channel := v_capture_link_type;
    END IF;
  END IF;

  -- Fallback especifico de 'retiro' (siempre cae a un admin si no hay
  -- match): regla de negocio propia de ese tipo, no se generaliza a tipos
  -- nuevos a proposito. Un tipo nuevo sin match cae al fallback generico de
  -- abajo (email hardcodeado, despues admin mas antiguo), igual que 'pb'.
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

NOTIFY pgrst, 'reload schema';
