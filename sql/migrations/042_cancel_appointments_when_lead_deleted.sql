-- Query permanente
-- Dominio: agenda / leads
-- Objetivo: liberar horas aunque un lead con cita se elimine por un flujo distinto a la UI

CREATE OR REPLACE FUNCTION public.cancel_active_appointments_for_deleted_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text;
  v_appointment record;
BEGIN
  IF NEW.deleted_at IS NULL OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  v_reason := format(
    'Cita cancelada automaticamente porque el lead %s fue eliminado.',
    coalesce(nullif(trim(NEW.name), ''), NEW.id::text)
  );

  FOR v_appointment IN
    SELECT appointment.*
    FROM public.appointments appointment
    WHERE appointment.lead_id = NEW.id
      AND appointment.user_id = NEW.user_id
      AND appointment.status IN ('pendiente', 'agendada', 'confirmada', 'tentativa')
    FOR UPDATE
  LOOP
    UPDATE public.appointments appointment
    SET
      status = 'cancelada',
      notes = concat_ws(E'\n', nullif(appointment.notes, ''), v_reason),
      google_sync_status = CASE
        WHEN appointment.google_event_id IS NULL THEN appointment.google_sync_status
        ELSE 'pending'
      END,
      google_sync_error = NULL,
      google_synced_at = CASE
        WHEN appointment.google_event_id IS NULL THEN appointment.google_synced_at
        ELSE NULL
      END,
      updated_at = timezone('utc'::text, now())
    WHERE appointment.id = v_appointment.id;

    INSERT INTO public.appointment_audit_events (
      appointment_id,
      user_id,
      event_type,
      previous_status,
      next_status,
      previous_start_time,
      next_start_time,
      previous_end_time,
      next_end_time,
      note
    )
    VALUES (
      v_appointment.id,
      v_appointment.user_id,
      'cancelled',
      v_appointment.status,
      'cancelada',
      v_appointment.start_time,
      v_appointment.start_time,
      v_appointment.end_time,
      v_appointment.end_time,
      v_reason
    );
  END LOOP;

  UPDATE public.leads lead
  SET
    metadata = coalesce(lead.metadata, '{}'::jsonb)
      || jsonb_build_object('appointment_status', 'cancelada'),
    updated_at = timezone('utc'::text, now())
  WHERE lead.id = NEW.id
    AND lead.user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cancel_active_appointments_for_deleted_lead_trigger ON public.leads;

CREATE TRIGGER cancel_active_appointments_for_deleted_lead_trigger
AFTER UPDATE OF deleted_at ON public.leads
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at))
EXECUTE FUNCTION public.cancel_active_appointments_for_deleted_lead();

COMMENT ON FUNCTION public.cancel_active_appointments_for_deleted_lead() IS
'Cancels active appointments automatically when a lead is soft-deleted, preventing ghost blocked slots in public agenda.';

NOTIFY pgrst, 'reload schema';
