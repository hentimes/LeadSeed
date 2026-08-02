-- Query permanente
-- Dominio: admin / supervision de usuarios
-- Objetivo: alinear la firma de list_admin_user_leads con el tipo real de public.leads.score

CREATE OR REPLACE FUNCTION public.list_admin_user_leads(
  p_observed_user_id uuid,
  p_limit integer DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  phone text,
  email text,
  company text,
  rut text,
  status text,
  score integer,
  lista_ids integer[],
  notes text,
  scheduled_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  assigned_at timestamptz,
  first_contacted_at timestamptz,
  closed_at timestamptz,
  estimated_value numeric,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
  v_limit integer := NULLIF(least(greatest(coalesce(p_limit, 0), 0), 500), 0);
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
    lead.id,
    lead.user_id,
    lead.name,
    lead.phone,
    lead.email,
    lead.company,
    lead.rut,
    lead.status,
    lead.score,
    lead.lista_ids,
    lead.notes,
    lead.scheduled_at,
    lead.utm_source,
    lead.utm_medium,
    lead.utm_campaign,
    lead.utm_term,
    lead.utm_content,
    lead.assigned_at,
    lead.first_contacted_at,
    lead.closed_at,
    lead.estimated_value,
    lead.metadata,
    lead.created_at,
    lead.updated_at,
    lead.deleted_at
  FROM public.leads lead
  WHERE lead.user_id = p_observed_user_id
    AND lead.deleted_at IS NULL
  ORDER BY lead.created_at DESC
  LIMIT coalesce(v_limit, 2147483647);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_admin_user_leads(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.list_admin_user_leads(uuid, integer) IS
'Devuelve leads vivos del usuario solicitado para el workspace admin con tipos alineados al esquema real de public.leads.';

NOTIFY pgrst, 'reload schema';
