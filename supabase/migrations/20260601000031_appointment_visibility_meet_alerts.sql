-- Query permanente
-- Dominio: planespro_agenda / visibilidad de citas
-- Objetivo: exponer Meet y estado Google en el listado interno de citas sin exponer tokens

DROP FUNCTION IF EXISTS public.list_my_appointments(date, date);

CREATE OR REPLACE FUNCTION public.list_my_appointments(
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
  v_user_id uuid := auth.uid();
  v_from date := coalesce(p_from, current_date);
  v_to date := coalesce(p_to, current_date + 14);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
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
  WHERE appointment.user_id = v_user_id
    AND appointment.start_time < (v_to + 1)::timestamptz
    AND appointment.end_time >= v_from::timestamptz
  ORDER BY appointment.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_appointments(date, date) TO authenticated;

COMMENT ON FUNCTION public.list_my_appointments(date, date) IS
'Lists appointments for the authenticated user, including non-sensitive Google replica status and Meet link when available.';
