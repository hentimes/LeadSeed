-- Query permanente
-- Dominio: planespro_agenda / participantes
-- Objetivo: gestionar participantes de citas desde MENSAJES y prepararlos para replica a Google Calendar

CREATE TABLE IF NOT EXISTS public.appointment_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  participant_role text NOT NULL DEFAULT 'guest' CHECK (participant_role IN ('guest', 'lead', 'internal')),
  invitation_status text NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'synced', 'error', 'skipped')),
  google_sync_error text,
  google_synced_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_participants_active_email_idx
ON public.appointment_participants (appointment_id, lower(email))
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS appointment_participants_user_appointment_idx
ON public.appointment_participants (user_id, appointment_id)
WHERE deleted_at IS NULL;

ALTER TABLE public.appointment_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own appointment participants" ON public.appointment_participants;
CREATE POLICY "Users can view their own appointment participants"
ON public.appointment_participants
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own appointment participants" ON public.appointment_participants;
CREATE POLICY "Users can manage their own appointment participants"
ON public.appointment_participants
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'appointment_participants'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_participants';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.list_my_appointment_participants(
  p_from date DEFAULT current_date,
  p_to date DEFAULT current_date + 14
)
RETURNS TABLE (
  id uuid,
  appointment_id uuid,
  email text,
  name text,
  participant_role text,
  invitation_status text,
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
    participant.id,
    participant.appointment_id,
    participant.email,
    participant.name,
    participant.participant_role,
    participant.invitation_status,
    participant.google_sync_error,
    participant.google_synced_at,
    participant.created_at,
    participant.updated_at
  FROM public.appointment_participants participant
  JOIN public.appointments appointment ON appointment.id = participant.appointment_id
  WHERE participant.user_id = v_user_id
    AND appointment.user_id = v_user_id
    AND participant.deleted_at IS NULL
    AND appointment.start_time < (v_to + 1)::timestamptz
    AND appointment.end_time >= v_from::timestamptz
  ORDER BY appointment.start_time ASC, participant.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_my_appointment_participant(
  p_appointment_id uuid,
  p_email text,
  p_name text DEFAULT NULL,
  p_participant_role text DEFAULT 'guest'
)
RETURNS TABLE (
  id uuid,
  appointment_id uuid,
  email text,
  name text,
  participant_role text,
  invitation_status text,
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
  v_email text := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_role text := lower(nullif(trim(coalesce(p_participant_role, 'guest')), ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF v_email IS NULL OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'valid email is required';
  END IF;

  IF v_role NOT IN ('guest', 'lead', 'internal') THEN
    v_role := 'guest';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.appointments appointment
    WHERE appointment.id = p_appointment_id
      AND appointment.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'appointment not found';
  END IF;

  RETURN QUERY
  INSERT INTO public.appointment_participants (
    appointment_id,
    user_id,
    email,
    name,
    participant_role,
    invitation_status,
    created_at,
    updated_at
  )
  VALUES (
    p_appointment_id,
    v_user_id,
    v_email,
    v_name,
    v_role,
    'pending',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (appointment_id, lower(email)) WHERE deleted_at IS NULL
  DO UPDATE SET
    name = coalesce(excluded.name, appointment_participants.name),
    participant_role = excluded.participant_role,
    invitation_status = 'pending',
    google_sync_error = NULL,
    updated_at = timezone('utc'::text, now())
  RETURNING
    appointment_participants.id,
    appointment_participants.appointment_id,
    appointment_participants.email,
    appointment_participants.name,
    appointment_participants.participant_role,
    appointment_participants.invitation_status,
    appointment_participants.google_sync_error,
    appointment_participants.google_synced_at,
    appointment_participants.created_at,
    appointment_participants.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_appointment_participant(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.appointment_participants participant
  SET
    deleted_at = timezone('utc'::text, now()),
    invitation_status = 'pending',
    updated_at = timezone('utc'::text, now())
  WHERE participant.id = p_participant_id
    AND participant.user_id = v_user_id
    AND participant.deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_appointment_participants(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_my_appointment_participant(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_appointment_participant(uuid) TO authenticated;

COMMENT ON TABLE public.appointment_participants IS
'Participantes agregados explicitamente desde MENSAJES para citas y replica opcional a invitados de Google Calendar.';

NOTIFY pgrst, 'reload schema';
