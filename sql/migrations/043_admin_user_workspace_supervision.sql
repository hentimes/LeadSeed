-- Query permanente
-- Dominio: admin / supervision de usuarios
-- Objetivo: permitir a superadmin observar leads nuevos y agenda de usuarios sin mezclar su agenda propia

CREATE TABLE IF NOT EXISTS public.admin_user_monitor_state (
  admin_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  observed_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen_lead_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (admin_user_id, observed_user_id),
  CONSTRAINT admin_user_monitor_state_distinct_users_check CHECK (admin_user_id <> observed_user_id)
);

CREATE INDEX IF NOT EXISTS admin_user_monitor_state_observed_idx
ON public.admin_user_monitor_state (observed_user_id, updated_at DESC);

ALTER TABLE public.admin_user_monitor_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their own monitor state" ON public.admin_user_monitor_state;
CREATE POLICY "Admins can view their own monitor state"
ON public.admin_user_monitor_state
FOR SELECT
USING (
  auth.uid() = admin_user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can manage their own monitor state" ON public.admin_user_monitor_state;
CREATE POLICY "Admins can manage their own monitor state"
ON public.admin_user_monitor_state
FOR ALL
USING (
  auth.uid() = admin_user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = admin_user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.touch_admin_user_monitor_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_admin_user_monitor_state_updated_at_trigger ON public.admin_user_monitor_state;
CREATE TRIGGER touch_admin_user_monitor_state_updated_at_trigger
BEFORE UPDATE ON public.admin_user_monitor_state
FOR EACH ROW
EXECUTE FUNCTION public.touch_admin_user_monitor_state_updated_at();

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
      WHERE lead.created_at > coalesce(monitor_state.last_seen_lead_created_at, timezone('utc', now()))
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

  IF p_observed_user_id IS NULL OR p_observed_user_id = v_admin_user_id THEN
    RAISE EXCEPTION 'observed user required';
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

  IF p_observed_user_id IS NULL OR p_observed_user_id = v_admin_user_id THEN
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

GRANT EXECUTE ON FUNCTION public.list_admin_user_lead_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_admin_user_leads_seen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_user_appointments(uuid, date, date) TO authenticated;

COMMENT ON TABLE public.admin_user_monitor_state IS
'Stores persistent per-admin observation state for other users, such as the last lead creation timestamp acknowledged in the admin workspace.';

COMMENT ON FUNCTION public.list_admin_user_lead_alerts() IS
'Returns unseen lead counters per observed user for the authenticated admin without mixing operational lead ownership.';

COMMENT ON FUNCTION public.mark_admin_user_leads_seen(uuid) IS
'Marks the current lead frontier of an observed user as seen for the authenticated admin.';

COMMENT ON FUNCTION public.list_admin_user_appointments(uuid, date, date) IS
'Returns read-only appointments for an observed user inside the admin workspace without affecting the admin own agenda.';

NOTIFY pgrst, 'reload schema';
