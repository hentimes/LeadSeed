-- fix_capture_links_default_index_per_type
--
-- Bug encontrado al verificar 20260806000300_form_types_registry.sql en
-- produccion (no en una transaccion de prueba, en el intento real de
-- registrar el tipo 'form' y crear su primer link): create_my_capture_link
-- fallo con "duplicate key value violates unique constraint
-- capture_links_one_default_per_owner_idx".
--
-- Esa migracion (090) generalizo la promocion a "link principal" para que
-- aplique por tipo (cada form_type abierto tiene su propio default por
-- usuario), pero paso por alto un indice unico previo de
-- 021_capture_links_analytics_and_cross_exec_alerts.sql:
--   CREATE UNIQUE INDEX capture_links_one_default_per_owner_idx
--   ON capture_links (owner_user_id) WHERE is_default = true;
-- Ese indice es GLOBAL por owner (un solo default en toda la cuenta,
-- sin importar el tipo), asi que bloqueaba tener un default 'pb' Y un
-- default 'form' al mismo tiempo para el mismo usuario.
--
-- is_default no se usa en ninguna resolucion de ownership de leads (esa
-- logica resuelve siempre por ref_code, ver resolve_planespro_booking_context)
-- - es puramente un concepto de UI ("tu link principal de X"). Con multiples
-- tipos de formulario coexistiendo, tiene mas sentido que cada tipo tenga su
-- propio default por usuario (asi lo espera la UI nueva, una seccion por
-- tipo) que un unico default global que ya no representa nada concreto.
--
-- Fix: reemplazar el indice global por uno scoped a (owner_user_id, link_type).

DROP INDEX IF EXISTS public.capture_links_one_default_per_owner_idx;

CREATE UNIQUE INDEX IF NOT EXISTS capture_links_one_default_per_owner_and_type_idx
ON public.capture_links (owner_user_id, link_type)
WHERE is_default = true;

-- update_my_capture_link (024_capture_links_management_rpcs.sql) tenia el
-- mismo problema en su promocion a default: al marcar un link como
-- principal, des-marcaba TODOS los defaults del owner sin filtrar por
-- link_type, lo que habria des-marcado (por ejemplo) el default de 'pb' al
-- marcar un default de 'form'. Cuerpo identico al original salvo el
-- "Cambio" marcado abajo.
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
    -- Cambio: se agrega "AND link_type = v_link.link_type" para no
    -- des-marcar el default de otro tipo de formulario.
    UPDATE public.capture_links
    SET is_default = false,
        updated_at = timezone('utc'::text, now())
    WHERE owner_user_id = v_owner_user_id
      AND id <> p_link_id
      AND deleted_at IS NULL
      AND is_default = true
      AND link_type = v_link.link_type;
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

NOTIFY pgrst, 'reload schema';
