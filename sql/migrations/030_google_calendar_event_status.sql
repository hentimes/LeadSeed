-- Query permanente
-- Dominio: planespro_agenda / Google Calendar
-- Objetivo: registrar estado de replica externa de citas Supabase hacia Google Calendar

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS google_sync_status text NOT NULL DEFAULT 'pending'
  CHECK (google_sync_status IN ('pending', 'synced', 'error', 'skipped')),
ADD COLUMN IF NOT EXISTS google_sync_error text,
ADD COLUMN IF NOT EXISTS google_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS appointments_google_sync_status_idx
ON public.appointments (user_id, google_sync_status, start_time);

COMMENT ON COLUMN public.appointments.google_sync_status IS
'Estado de replica no bloqueante hacia Google Calendar. Supabase sigue siendo la fuente de verdad.';

COMMENT ON COLUMN public.appointments.google_sync_error IS
'Ultimo error no sensible al intentar crear o actualizar el evento externo en Google Calendar.';

COMMENT ON COLUMN public.appointments.google_synced_at IS
'Fecha del ultimo exito de replica hacia Google Calendar.';
