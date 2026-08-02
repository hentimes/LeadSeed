-- Query permanente
-- Dominio: planespro_agenda / auditoria
-- Objetivo: exponer historial visible de citas para MENSAJES sin leer la tabla directo desde UI

CREATE OR REPLACE FUNCTION public.list_my_appointment_audit_events(
  p_from date DEFAULT current_date,
  p_to date DEFAULT current_date + 30
)
RETURNS TABLE (
  id uuid,
  appointment_id uuid,
  event_type text,
  previous_status text,
  next_status text,
  previous_start_time timestamptz,
  next_start_time timestamptz,
  previous_end_time timestamptz,
  next_end_time timestamptz,
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from date := coalesce(p_from, current_date);
  v_to date := coalesce(p_to, current_date + 30);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF v_to < v_from THEN
    RAISE EXCEPTION 'p_to must be greater than or equal to p_from';
  END IF;

  RETURN QUERY
  SELECT
    audit.id,
    audit.appointment_id,
    audit.event_type,
    audit.previous_status,
    audit.next_status,
    audit.previous_start_time,
    audit.next_start_time,
    audit.previous_end_time,
    audit.next_end_time,
    audit.note,
    audit.created_at
  FROM public.appointment_audit_events audit
  JOIN public.appointments appointment ON appointment.id = audit.appointment_id
  WHERE audit.user_id = v_user_id
    AND appointment.user_id = v_user_id
    AND appointment.start_time < (v_to + 1)::timestamptz
    AND appointment.end_time >= v_from::timestamptz
  ORDER BY audit.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_appointment_audit_events(date, date) TO authenticated;

COMMENT ON FUNCTION public.list_my_appointment_audit_events(date, date) IS
'Devuelve historial visible de citas propias para MENSAJES, limitado por rango de fechas.';
