-- Query permanente
-- Dominio: planespro_agenda / cierre de citas
-- Objetivo: registrar como transcurrio una cita ya pasada (asistencia y minuta)
--
-- La agenda sabia agendar, reprogramar y cancelar, pero no sabia CERRAR. Una
-- cita cuya hora ya paso se quedaba en 'agendada' para siempre, con el mismo
-- aspecto que una que todavia no ocurrio, y lo que se hablo en ella no vivia
-- en ninguna parte. El estado 'completada' y 'no_asistio' ya estaban admitidos
-- por `appointments_status_check` desde la migracion 025; lo que faltaba era
-- por donde escribirlos.
--
-- ## Por que una columna nueva y no `notes`
--
-- `notes` es la nota con la que se AGENDA la cita: para que es la reunion. La
-- minuta es lo contrario, que salio de ella. Guardarlas en el mismo campo
-- obligaria a concatenar y perderia la de antes, que es justamente el contexto
-- que se quiere tener delante al escribir la de despues.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS outcome_notes text,
  ADD COLUMN IF NOT EXISTS outcome_recorded_at timestamptz;

COMMENT ON COLUMN public.appointments.outcome_notes IS
  'Minuta: que paso en la reunion. Distinta de notes, que es para que se agendo.';

COMMENT ON COLUMN public.appointments.outcome_recorded_at IS
  'Cuando se cerro la cita. Su ausencia es lo que marca una cita pasada como pendiente de registrar.';

-- El historial de la cita ya registra reprogramaciones y cancelaciones; el
-- cierre es un cambio de estado mas y merece la misma trazabilidad.
ALTER TABLE public.appointment_audit_events
  DROP CONSTRAINT IF EXISTS appointment_audit_events_event_type_check;

ALTER TABLE public.appointment_audit_events
  ADD CONSTRAINT appointment_audit_events_event_type_check
  CHECK (event_type IN (
    'created_from_lead',
    'rescheduled',
    'cancelled',
    'google_sync_error',
    'participant_added',
    'participant_removed',
    'outcome_recorded'
  ));

CREATE OR REPLACE FUNCTION public.record_my_appointment_outcome(
  p_appointment_id uuid,
  p_attended boolean,
  p_outcome_notes text DEFAULT NULL
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
  outcome_notes text,
  outcome_recorded_at timestamptz,
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
  v_appointment record;
  v_next_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT *
  INTO v_appointment
  FROM public.appointments appointment
  WHERE appointment.id = p_appointment_id
    AND appointment.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment not found';
  END IF;

  -- Una cita que todavia no ocurrio no se puede cerrar: se sabria como fue
  -- antes de que pasara. Se compara contra el fin, no contra el inicio.
  IF v_appointment.end_time > timezone('utc'::text, now()) THEN
    RAISE EXCEPTION 'appointment has not finished yet';
  END IF;

  IF v_appointment.status = 'cancelada' THEN
    RAISE EXCEPTION 'a cancelled appointment has no outcome';
  END IF;

  v_next_status := CASE WHEN p_attended THEN 'completada' ELSE 'no_asistio' END;

  UPDATE public.appointments
  SET status = v_next_status,
      outcome_notes = nullif(trim(coalesce(p_outcome_notes, '')), ''),
      outcome_recorded_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE public.appointments.id = p_appointment_id;

  INSERT INTO public.appointment_audit_events (
    appointment_id,
    user_id,
    event_type,
    previous_status,
    next_status,
    note
  ) VALUES (
    p_appointment_id,
    v_user_id,
    'outcome_recorded',
    v_appointment.status,
    v_next_status,
    nullif(trim(coalesce(p_outcome_notes, '')), '')
  );

  RETURN QUERY
  SELECT appointment.id,
         appointment.lead_id,
         lead.name,
         appointment.start_time,
         appointment.end_time,
         appointment.status,
         appointment.source_channel,
         appointment.capture_ref,
         appointment.notes,
         appointment.outcome_notes,
         appointment.outcome_recorded_at,
         appointment.meet_link,
         appointment.google_event_id,
         appointment.google_sync_status,
         appointment.google_sync_error,
         appointment.google_synced_at,
         appointment.created_at,
         appointment.updated_at
  FROM public.appointments appointment
  LEFT JOIN public.leads lead ON lead.id = appointment.lead_id
  WHERE appointment.id = p_appointment_id;
END;
$$;

COMMENT ON FUNCTION public.record_my_appointment_outcome(uuid, boolean, text) IS
  'Cierra una cita propia ya terminada: deja constancia de si el contacto se conecto y guarda la minuta.';

GRANT EXECUTE ON FUNCTION public.record_my_appointment_outcome(uuid, boolean, text) TO authenticated;


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
  outcome_notes text,
  outcome_recorded_at timestamptz,
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
    appointment.outcome_notes,
    appointment.outcome_recorded_at,
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

REVOKE EXECUTE ON FUNCTION public.list_my_appointments(date, date) FROM anon;

COMMENT ON FUNCTION public.list_my_appointments(date, date) IS
  'Citas propias en un rango, con el cierre de cada una (asistencia y minuta) para las que ya pasaron.';
