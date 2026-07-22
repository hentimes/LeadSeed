-- Query permanente
-- Dominio: admin / supervision de usuarios
-- Objetivo: permitir que el superadmin observe su propia base/agenda sin error y corregir el tipo real de templates.lead_ids

CREATE OR REPLACE FUNCTION public.mark_admin_user_leads_seen(
  p_observed_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
  v_last_seen timestamptz;
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

  IF p_observed_user_id = v_admin_user_id THEN
    RETURN;
  END IF;

  SELECT coalesce(max(lead.created_at), timezone('utc', now()))
  INTO v_last_seen
  FROM public.leads lead
  WHERE lead.user_id = p_observed_user_id
    AND lead.deleted_at IS NULL;

  INSERT INTO public.admin_user_monitor_state (
    admin_user_id,
    observed_user_id,
    last_seen_lead_created_at
  )
  VALUES (
    v_admin_user_id,
    p_observed_user_id,
    v_last_seen
  )
  ON CONFLICT (admin_user_id, observed_user_id)
  DO UPDATE
  SET last_seen_lead_created_at = excluded.last_seen_lead_created_at,
      updated_at = timezone('utc', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_user_appointments(
  p_observed_user_id uuid,
  p_from date DEFAULT current_date,
  p_to date DEFAULT current_date + 14
)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  lead_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  source_channel text,
  capture_ref text,
  notes text,
  meet_link text,
  google_event_id text,
  google_sync_status text,
  google_sync_error text,
  google_synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
  v_from date := coalesce(p_from, current_date);
  v_to date := coalesce(p_to, current_date + 14);
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
    RAISE EXCEPTION 'valid observed user required';
  END IF;

  IF v_to < v_from THEN
    RAISE EXCEPTION 'p_to must be greater than or equal to p_from';
  END IF;

  RETURN QUERY
  SELECT
    appointment.id,
    appointment.lead_id,
    lead.name,
    appointment.start_time,
    appointment.end_time,
    appointment.status,
    appointment.source_channel,
    appointment.capture_ref,
    appointment.notes,
    appointment.meet_link,
    appointment.google_event_id,
    appointment.google_sync_status,
    appointment.google_sync_error,
    appointment.google_synced_at,
    appointment.created_at,
    appointment.updated_at
  FROM public.appointments appointment
  LEFT JOIN public.leads lead ON lead.id = appointment.lead_id
  WHERE appointment.user_id = p_observed_user_id
    AND appointment.start_time < (v_to + 1)::timestamptz
    AND appointment.end_time >= v_from::timestamptz
  ORDER BY appointment.start_time ASC;
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
    template.lista_ids,
    template.template_list_ids,
    template.lead_list_ids,
    template.created_at
  FROM public.templates template
  WHERE template.user_id = p_observed_user_id
  ORDER BY template.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_admin_user_leads_seen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_user_appointments(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_user_leads(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_user_templates(uuid) TO authenticated;

COMMENT ON FUNCTION public.mark_admin_user_leads_seen(uuid) IS
'Marca como vistos los leads del usuario observado para el admin autenticado; si el admin se observa a si mismo no genera estado de monitor.';

COMMENT ON FUNCTION public.list_admin_user_appointments(uuid, date, date) IS
'Devuelve citas observadas del usuario solicitado, incluyendo al propio admin cuando se observa a si mismo desde Admin SaaS.';

COMMENT ON FUNCTION public.list_admin_user_leads(uuid, integer) IS
'Devuelve leads vivos del usuario solicitado para el workspace admin, incluyendo autoobservacion del admin.';

COMMENT ON FUNCTION public.list_admin_user_templates(uuid) IS
'Devuelve plantillas del usuario solicitado para el workspace admin usando el tipo real text[] de lead_ids.';

NOTIFY pgrst, 'reload schema';
