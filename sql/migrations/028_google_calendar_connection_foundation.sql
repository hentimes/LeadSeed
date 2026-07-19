-- Query permanente
-- Dominio: planespro_agenda / Google Calendar
-- Objetivo: guardar estado seguro de conexion y exponer solo metadata no sensible a MENSAJES

ALTER TABLE public.user_calendar_connections
ADD COLUMN IF NOT EXISTS last_sync_started_at timestamptz,
ADD COLUMN IF NOT EXISTS last_sync_finished_at timestamptz,
ADD COLUMN IF NOT EXISTS last_sync_status text CHECK (last_sync_status IN ('idle', 'running', 'ok', 'error')),
ADD COLUMN IF NOT EXISTS last_sync_error text;

CREATE INDEX IF NOT EXISTS user_calendar_connections_sync_idx
ON public.user_calendar_connections (last_sync_finished_at);

CREATE OR REPLACE FUNCTION public.get_my_calendar_connection_status()
RETURNS TABLE (
  provider text,
  google_email text,
  calendar_id text,
  connected_at timestamptz,
  token_scope text,
  token_expires_at timestamptz,
  last_sync_started_at timestamptz,
  last_sync_finished_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  is_connected boolean
)
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

  RETURN QUERY
  SELECT
    connection.provider,
    connection.google_email,
    connection.calendar_id,
    connection.connected_at,
    connection.token_scope,
    connection.token_expires_at,
    connection.last_sync_started_at,
    connection.last_sync_finished_at,
    coalesce(connection.last_sync_status, 'idle'),
    connection.last_sync_error,
    connection.refresh_token IS NOT NULL OR connection.access_token IS NOT NULL
  FROM public.user_calendar_connections connection
  WHERE connection.user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_calendar_connection_status() TO authenticated;

COMMENT ON FUNCTION public.get_my_calendar_connection_status() IS
'Returns non-sensitive Google Calendar connection metadata for the authenticated user. Tokens are never returned.';
