-- Query permanente
-- Dominio: planespro_agenda / gestion de citas
-- Objeto: reschedule_my_appointment(uuid, timestamptz), cancel_my_appointment(uuid, text)
-- Clase: funciones
-- Impacto: restaura cancelar y reprogramar, rotas desde la 139
-- Persistencia: permanente
--
-- SINTOMA
--
-- Cancelar una cita no hacia nada. El dialogo de confirmacion aparecia, se
-- confirmaba, y la cita seguia ahi.
--
-- CAUSA
--
-- Las dos terminan con `RETURN QUERY SELECT * FROM list_my_appointments(...)`,
-- y su `RETURNS TABLE` declara dieciseis columnas. La 139 le agrego dos a
-- `list_my_appointments` -`outcome_notes` y `outcome_recorded_at`-, asi que
-- ese `SELECT *` pasa a devolver dieciocho y Postgres aborta con
-- `structure of query does not match function result type`.
--
-- La 139 redefinio `list_my_appointments` sin mirar quien la consumia desde
-- dentro de la base. El error tampoco se veia: el manejador de cancelar pone el
-- mensaje y acto seguido recarga la agenda, y la recarga lo borra.
--
-- CORRECCION
--
-- El tipo de retorno gana las dos columnas, y el `SELECT *` se sustituye por
-- la lista explicita de las dieciocho. Lo segundo es lo que importa a futuro:
-- con `*`, cualquier columna que se le agregue a `list_my_appointments`
-- vuelve a romper estas dos en silencio; con la lista escrita, no.
--
-- REVERSION
--
--   Volver a aplicar sql/migrations/033_appointment_reschedule_cancel.sql,
--   que deja las dos funciones con dieciseis columnas. Solo es valido si antes
--   se revierte la 139.


-- `create or replace` no sirve aca: no puede cambiar el tipo de retorno de una
-- funcion existente (42P13). Se retiran y se vuelven a crear. Nadie mas las
-- llama desde dentro de la base -verificado sobre todas las migraciones-, asi
-- que el DROP no arrastra nada.
DROP FUNCTION IF EXISTS public.reschedule_my_appointment(uuid, timestamptz);
DROP FUNCTION IF EXISTS public.cancel_my_appointment(uuid, text);

CREATE OR REPLACE FUNCTION public.reschedule_my_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz
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
  v_duration_minutes integer;
  v_ends_at timestamptz;
  v_conflict_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= timezone('utc'::text, now()) THEN
    RAISE EXCEPTION 'new appointment start must be in the future';
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

  IF v_appointment.status NOT IN ('pendiente', 'agendada', 'confirmada', 'tentativa') THEN
    RAISE EXCEPTION 'only active appointments can be rescheduled';
  END IF;

  v_duration_minutes := greatest(15, least(180, coalesce(v_appointment.appointment_duration_minutes, 45) + coalesce(v_appointment.appointment_buffer_minutes, 0)));
  v_ends_at := p_starts_at + make_interval(mins => v_duration_minutes);

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments other_appointment
    WHERE other_appointment.user_id = v_user_id
      AND other_appointment.id <> p_appointment_id
      AND other_appointment.status IN ('pendiente', 'agendada', 'confirmada', 'tentativa')
      AND other_appointment.start_time < v_ends_at
      AND other_appointment.end_time > p_starts_at
    UNION ALL
    SELECT 1
    FROM public.user_availability_blocks block
    WHERE block.user_id = v_user_id
      AND block.starts_at < v_ends_at
      AND block.ends_at > p_starts_at
  )
  INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RAISE EXCEPTION 'El nuevo horario no esta disponible';
  END IF;

  UPDATE public.appointments appointment
  SET
    start_time = p_starts_at,
    end_time = v_ends_at,
    status = CASE WHEN appointment.status = 'pendiente' THEN 'agendada' ELSE appointment.status END,
    google_sync_status = CASE WHEN appointment.google_event_id IS NULL THEN appointment.google_sync_status ELSE 'pending' END,
    google_sync_error = NULL,
    google_synced_at = CASE WHEN appointment.google_event_id IS NULL THEN appointment.google_synced_at ELSE NULL END,
    updated_at = timezone('utc'::text, now())
  WHERE appointment.id = p_appointment_id
    AND appointment.user_id = v_user_id;

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
    p_appointment_id,
    v_user_id,
    'rescheduled',
    v_appointment.status,
    CASE WHEN v_appointment.status = 'pendiente' THEN 'agendada' ELSE v_appointment.status END,
    v_appointment.start_time,
    p_starts_at,
    v_appointment.end_time,
    v_ends_at,
    'Reprogramada desde MENSAJES'
  );

  IF v_appointment.lead_id IS NOT NULL THEN
    UPDATE public.leads lead
    SET
      scheduled_at = p_starts_at,
      metadata = coalesce(lead.metadata, '{}'::jsonb)
        || jsonb_build_object(
          'appointment_id', p_appointment_id,
          'appointment_status', CASE WHEN v_appointment.status = 'pendiente' THEN 'agendada' ELSE v_appointment.status END
        ),
      updated_at = timezone('utc'::text, now())
    WHERE lead.id = v_appointment.lead_id
      AND lead.user_id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT
    cita.id,
    cita.lead_id,
    cita.lead_name,
    cita.starts_at,
    cita.ends_at,
    cita.status,
    cita.source_channel,
    cita.capture_ref,
    cita.notes,
    cita.outcome_notes,
    cita.outcome_recorded_at,
    cita.meet_link,
    cita.google_event_id,
    cita.google_sync_status,
    cita.google_sync_error,
    cita.google_synced_at,
    cita.created_at,
    cita.updated_at
  FROM public.list_my_appointments((p_starts_at AT TIME ZONE coalesce(v_appointment.timezone, 'America/Santiago'))::date, (p_starts_at AT TIME ZONE coalesce(v_appointment.timezone, 'America/Santiago'))::date) cita
  WHERE cita.id = p_appointment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_my_appointment(
  p_appointment_id uuid,
  p_reason text DEFAULT NULL
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
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
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

  IF v_appointment.status IN ('cancelada', 'rechazada') THEN
    RAISE EXCEPTION 'appointment is already cancelled';
  END IF;

  UPDATE public.appointments appointment
  SET
    status = 'cancelada',
    notes = concat_ws(E'\n', nullif(appointment.notes, ''), CASE WHEN v_reason IS NULL THEN NULL ELSE 'Cancelacion: ' || v_reason END),
    google_sync_status = CASE WHEN appointment.google_event_id IS NULL THEN appointment.google_sync_status ELSE 'pending' END,
    google_sync_error = NULL,
    google_synced_at = CASE WHEN appointment.google_event_id IS NULL THEN appointment.google_synced_at ELSE NULL END,
    updated_at = timezone('utc'::text, now())
  WHERE appointment.id = p_appointment_id
    AND appointment.user_id = v_user_id;

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
    p_appointment_id,
    v_user_id,
    'cancelled',
    v_appointment.status,
    'cancelada',
    v_appointment.start_time,
    v_appointment.start_time,
    v_appointment.end_time,
    v_appointment.end_time,
    v_reason
  );

  IF v_appointment.lead_id IS NOT NULL THEN
    UPDATE public.leads lead
    SET
      metadata = coalesce(lead.metadata, '{}'::jsonb)
        || jsonb_build_object(
          'appointment_id', p_appointment_id,
          'appointment_status', 'cancelada'
        ),
      updated_at = timezone('utc'::text, now())
    WHERE lead.id = v_appointment.lead_id
      AND lead.user_id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT
    cita.id,
    cita.lead_id,
    cita.lead_name,
    cita.starts_at,
    cita.ends_at,
    cita.status,
    cita.source_channel,
    cita.capture_ref,
    cita.notes,
    cita.outcome_notes,
    cita.outcome_recorded_at,
    cita.meet_link,
    cita.google_event_id,
    cita.google_sync_status,
    cita.google_sync_error,
    cita.google_synced_at,
    cita.created_at,
    cita.updated_at
  FROM public.list_my_appointments((v_appointment.start_time AT TIME ZONE coalesce(v_appointment.timezone, 'America/Santiago'))::date, (v_appointment.start_time AT TIME ZONE coalesce(v_appointment.timezone, 'America/Santiago'))::date) cita
  WHERE cita.id = p_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reschedule_my_appointment(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_appointment(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.reschedule_my_appointment(uuid, timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.cancel_my_appointment(uuid, text) FROM public;

GRANT EXECUTE ON FUNCTION public.reschedule_my_appointment(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_appointment(uuid, text) TO authenticated;
