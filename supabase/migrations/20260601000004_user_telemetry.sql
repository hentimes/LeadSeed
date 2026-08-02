-- Query permanente
-- Dominio: profiles
-- Objetivo: crear telemetria por usuario y RPC de incremento

CREATE TABLE IF NOT EXISTS public.user_telemetry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL,
  total_seconds integer DEFAULT 0,
  last_updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, section)
);

ALTER TABLE public.user_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own telemetry" ON public.user_telemetry;
CREATE POLICY "Users can insert their own telemetry"
ON public.user_telemetry
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own telemetry" ON public.user_telemetry;
CREATE POLICY "Users can update their own telemetry"
ON public.user_telemetry
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own telemetry" ON public.user_telemetry;
CREATE POLICY "Users can view their own telemetry"
ON public.user_telemetry
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and helpers can view telemetry" ON public.user_telemetry;
CREATE POLICY "Admins and helpers can view telemetry"
ON public.user_telemetry
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

CREATE OR REPLACE FUNCTION public.increment_telemetry(p_user_id uuid, p_section text, p_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_telemetry (user_id, section, total_seconds, last_updated_at)
  VALUES (p_user_id, p_section, p_seconds, timezone('utc'::text, now()))
  ON CONFLICT (user_id, section) DO UPDATE
  SET
    total_seconds = public.user_telemetry.total_seconds + EXCLUDED.total_seconds,
    last_updated_at = EXCLUDED.last_updated_at;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_telemetry'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_telemetry';
  END IF;
END $$;
