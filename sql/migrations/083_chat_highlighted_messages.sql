-- Query permanente
-- Dominio: chat
-- Objetivo: destacar mensajes, publico y separado de "guardar" (que es
--           privado por usuario). Cualquiera puede destacar un mensaje;
--           aparece en el panel de info de la sala; lo puede quitar el admin,
--           el helper, o quien lo destaco.

CREATE TABLE IF NOT EXISTS public.chat_highlighted_messages (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  highlighted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (message_id, highlighted_by)
);

CREATE INDEX IF NOT EXISTS chat_highlighted_messages_room_idx
ON public.chat_highlighted_messages (room_id, created_at DESC);

ALTER TABLE public.chat_highlighted_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read highlights" ON public.chat_highlighted_messages;
CREATE POLICY "Authenticated users read highlights"
ON public.chat_highlighted_messages
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users highlight messages" ON public.chat_highlighted_messages;
CREATE POLICY "Users highlight messages"
ON public.chat_highlighted_messages
FOR INSERT
WITH CHECK (auth.uid() = highlighted_by);

DROP POLICY IF EXISTS "Owner or staff remove highlight" ON public.chat_highlighted_messages;
CREATE POLICY "Owner or staff remove highlight"
ON public.chat_highlighted_messages
FOR DELETE
USING (
  auth.uid() = highlighted_by
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_highlighted_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_highlighted_messages';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
