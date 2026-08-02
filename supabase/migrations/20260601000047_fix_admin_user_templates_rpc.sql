-- Query permanente
-- Dominio: admin / supervision de usuarios
-- Objetivo: corregir la RPC de templates observados para que use el esquema real de public.templates

DROP FUNCTION IF EXISTS public.list_admin_user_templates(uuid);

CREATE OR REPLACE FUNCTION public.list_admin_user_templates(
  p_observed_user_id uuid
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  content text,
  type text,
  lead_ids text[],
  template_list_ids integer[],
  lead_list_ids integer[],
  created_at timestamptz
)
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

  IF p_observed_user_id IS NULL THEN
    RAISE EXCEPTION 'observed user required';
  END IF;

  RETURN QUERY
  SELECT
    template.id,
    template.user_id,
    template.name,
    template.content,
    template.type,
    template.lead_ids,
    template.template_list_ids,
    template.lead_list_ids,
    template.created_at
  FROM public.templates template
  WHERE template.user_id = p_observed_user_id
  ORDER BY template.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_admin_user_templates(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_admin_user_templates(uuid) IS
'Devuelve plantillas del usuario solicitado para el workspace admin usando solo columnas reales de public.templates.';

NOTIFY pgrst, 'reload schema';
