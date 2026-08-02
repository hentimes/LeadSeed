-- Query permanente
-- Dominio: admin / rpc / seguridad
-- Objetivo: exigir rol admin en las transferencias administrativas de leads y templates
--
-- Contexto:
--   017_admin_transfer_rpcs.sql creo estas dos funciones como SECURITY DEFINER
--   (ignoran RLS) y las concedio a authenticated, pero sin validar quien llama.
--   Cualquier usuario autenticado podia reasignar leads o templates ajenos.
--
--   Esta migracion agrega la misma guardia que ya usan list_admin_user_leads,
--   list_admin_user_templates y el resto de las RPC de supervision.
--   El comportamiento para un admin legitimo no cambia.

CREATE OR REPLACE FUNCTION public.admin_transfer_leads(target_user_id uuid, lead_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
BEGIN
  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = v_admin_user_id
      AND profile.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target user required';
  END IF;

  IF lead_ids IS NULL OR array_length(lead_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'lead ids required';
  END IF;

  UPDATE public.leads
  SET user_id = target_user_id,
      updated_at = now()
  WHERE id = ANY(lead_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transfer_templates(target_user_id uuid, template_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
BEGIN
  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = v_admin_user_id
      AND profile.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target user required';
  END IF;

  IF template_ids IS NULL OR array_length(template_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'template ids required';
  END IF;

  UPDATE public.templates
  SET user_id = target_user_id
  WHERE id = ANY(template_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_transfer_leads(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_templates(uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.admin_transfer_leads(uuid, uuid[]) IS
  'Reasigna leads a otro usuario. Solo ejecutable por profiles.role = admin.';

COMMENT ON FUNCTION public.admin_transfer_templates(uuid, uuid[]) IS
  'Reasigna templates a otro usuario. Solo ejecutable por profiles.role = admin.';

NOTIFY pgrst, 'reload schema';
