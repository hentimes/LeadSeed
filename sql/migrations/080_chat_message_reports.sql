-- Query permanente
-- Dominio: chat
-- Objetivo: reportar mensajes del chat para que admin/helper los revisen.
--
-- Un mensaje reportado no se borra solo -- queda a la vista de staff hasta
-- que lo gestionen (descartar el reporte o eliminar el mensaje), y mientras
-- el reporte siga pendiente, la limpieza automatica de 30 dias lo respeta
-- igual que ya hace con guardados, fijados y anuncios.

CREATE TABLE IF NOT EXISTS public.chat_message_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS chat_message_reports_pending_idx
ON public.chat_message_reports (created_at)
WHERE status = 'pending';

ALTER TABLE public.chat_message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own reports" ON public.chat_message_reports;
CREATE POLICY "Users read their own reports"
ON public.chat_message_reports
FOR SELECT
USING (
  auth.uid() = reporter_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Users create their own reports" ON public.chat_message_reports;
CREATE POLICY "Users create their own reports"
ON public.chat_message_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Staff resolve reports" ON public.chat_message_reports;
CREATE POLICY "Staff resolve reports"
ON public.chat_message_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

CREATE OR REPLACE FUNCTION public.count_pending_chat_reports()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.chat_message_reports WHERE status = 'pending';
$$;

REVOKE ALL ON FUNCTION public.count_pending_chat_reports() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.count_pending_chat_reports() TO authenticated;

-- La limpieza de 30 dias tambien respeta los mensajes con un reporte
-- pendiente: si se borraran solos, el staff nunca alcanzaria a revisarlos.
CREATE OR REPLACE FUNCTION public.clean_old_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_messages m
  WHERE m.room_id = NEW.room_id
    AND m.created_at < now() - interval '30 days'
    AND NOT m.is_announcement
    AND NOT EXISTS (SELECT 1 FROM public.chat_saved_messages s WHERE s.message_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.chat_pinned_messages p WHERE p.message_id = m.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_message_reports r
      WHERE r.message_id = m.id AND r.status = 'pending'
    );

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_message_reports'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reports';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
