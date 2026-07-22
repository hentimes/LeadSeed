-- Query permanente
-- Dominio: admin / supervision de usuarios
-- Objetivo: exponer base observada del usuario por RPC admin-only y corregir el conteo inicial de alertas

CREATE OR REPLACE FUNCTION public.list_admin_user_lead_alerts()
RETURNS TABLE (
  observed_user_id uuid,
  unseen_new_leads_count bigint,
  latest_lead_created_at timestamptz
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

  RETURN QUERY
  WITH observed_profiles AS (
    SELECT profile.id
    FROM public.profiles profile
    WHERE profile.id <> v_admin_user_id
  ),
  monitor_state AS (
    SELECT state.observed_user_id, state.last_seen_lead_created_at
    FROM public.admin_user_monitor_state state
    WHERE state.admin_user_id = v_admin_user_id
  )
  SELECT
    observed.id AS observed_user_id,
    count(lead.id) FILTER (
      WHERE monitor_state.last_seen_lead_created_at IS NULL
         OR lead.created_at > monitor_state.last_seen_lead_created_at
    ) AS unseen_new_leads_count,
    max(lead.created_at) AS latest_lead_created_at
  FROM observed_profiles observed
  LEFT JOIN monitor_state ON monitor_state.observed_user_id = observed.id
  LEFT JOIN public.leads lead
    ON lead.user_id = observed.id
   AND lead.deleted_at IS NULL
  GROUP BY observed.id, monitor_state.last_seen_lead_created_at
  ORDER BY observed.id;
END;
$$;

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
  score numeric,
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

  IF p_observed_user_id IS NULL OR p_observed_user_id = v_admin_user_id THEN
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

CREATE OR REPLACE FUNCTION public.list_admin_user_templates(
  p_observed_user_id uuid
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  content text,
  type text,
  lead_ids uuid[],
  lista_ids integer[],
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

  IF p_observed_user_id IS NULL OR p_observed_user_id = v_admin_user_id THEN
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
    template.lista_ids,
    template.template_list_ids,
    template.lead_list_ids,
    template.created_at
  FROM public.templates template
  WHERE template.user_id = p_observed_user_id
  ORDER BY template.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_admin_user_lead_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_user_leads(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_user_templates(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_admin_user_leads(uuid, integer) IS
'Devuelve leads vivos de un usuario observado para el workspace admin sin depender de SELECT directo sujeto a RLS del cliente.';

COMMENT ON FUNCTION public.list_admin_user_templates(uuid) IS
'Devuelve plantillas del usuario observado para la vista Base del superadmin.';

NOTIFY pgrst, 'reload schema';
