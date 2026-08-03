-- 070 - El admin puede crear links de captura ilimitados
--
-- Se definio: "El admin puede crear tantos links como quiera. Luego
-- definimos el resto de los roles." Los demas roles quedan exactamente
-- como estaban (1 a 5 segun profiles.capture_links_limit, sin cambios).
--
-- Se encontraron dos problemas al revisar el mecanismo actual:
--
--   1. get_profile_capture_links_limit() no le daba ningun trato especial
--      al rol admin: clampaba profiles.capture_links_limit entre 1 y 5
--      sin mirar el rol. Confirmado en produccion: el unico admin del
--      sistema tenia capture_links_limit=1, igual que los vendedores.
--
--   2. El limite nunca se aplicaba en el servidor. create_my_capture_link
--      no comparaba la cantidad de links existentes contra el limite en
--      ningun lado; el "Limite de links alcanzado para tu perfil" que se
--      ve en Configuracion es una condicion puramente del cliente
--      (links.length < captureLinksLimit en CaptureLinksSettings.tsx).
--      Cualquiera podia saltarselo llamando al RPC directo. Se aprovecha
--      esta migracion para cerrarlo: seria inconsistente definir "el
--      admin no tiene limite" sin que el limite de los demas sea una
--      regla real.
--
-- NULL representa "sin limite" en vez de un numero grande arbitrario: es
-- explicito, no hay que acordarse de que "el numero magico es 999999", y
-- distingue sin ambiguedad "sin limite" de "limite alto".

-- ---------------------------------------------------------------------------
-- El admin no tiene limite
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_capture_links_limit(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $function$
  SELECT
    CASE
      WHEN p.role = 'admin' THEN NULL
      ELSE least(greatest(coalesce(p.capture_links_limit, 1), 1), 5)
    END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$function$;

-- ---------------------------------------------------------------------------
-- Exponer el limite sin depender de que existan links
-- ---------------------------------------------------------------------------
-- list_my_capture_links() repite el limite en cada fila, asi que con cero
-- links el cliente no tiene de donde leerlo: exactamente el caso de un
-- admin recien creado sin links todavia. Se agrega un RPC propio que
-- siempre devuelve algo, tenga o no links el usuario.
CREATE OR REPLACE FUNCTION public.get_my_capture_links_limit()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_profile_capture_links_limit(auth.uid());
$function$;

COMMENT ON FUNCTION public.get_my_capture_links_limit() IS
  'Limite de links de captura del usuario actual. NULL significa sin limite. Existe aparte de list_my_capture_links() porque ese RPC no devuelve nada si el usuario todavia no tiene ningun link.';

REVOKE ALL ON FUNCTION public.get_my_capture_links_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_capture_links_limit() TO authenticated;

-- ---------------------------------------------------------------------------
-- Aplicar el limite de verdad en create_my_capture_link
-- ---------------------------------------------------------------------------
-- Cuerpo identico al desplegado (extraido con pg_get_functiondef), con el
-- unico agregado: el chequeo de limite al principio, antes de crear nada.
CREATE OR REPLACE FUNCTION public.create_my_capture_link(p_label text, p_campaign_name text DEFAULT NULL::text, p_ref_code text DEFAULT NULL::text, p_stats_config jsonb DEFAULT '{}'::jsonb, p_metadata jsonb DEFAULT '{}'::jsonb, p_is_default boolean DEFAULT false)
 RETURNS capture_links
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_user_id uuid := auth.uid();
  v_label text := nullif(trim(coalesce(p_label, '')), '');
  v_ref_code text := public.normalize_capture_ref(p_ref_code);
  v_is_default boolean := coalesce(p_is_default, false);
  v_link public.capture_links%ROWTYPE;
  v_limit integer;
  v_current_count integer;
BEGIN
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;

  -- NULL de get_profile_capture_links_limit es "sin limite" (rol admin):
  -- no se compara contra nada. Es el unico agregado a esta funcion.
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
$function$;
