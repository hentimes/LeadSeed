-- Query permanente
-- Dominio: chat
-- Objetivo: mensajeria directa entre usuarios en tabla propia, separada de
--           internal_messages (que sigue siendo solo para soporte).
--
-- El boton de "mensaje directo" del chat reutilizaba internal_messages, la
-- misma tabla que usa el chat flotante de soporte del admin (recibe/emite/lee
-- por sender_id/receiver_id igual que un DM). Eso hacia que una conversacion
-- entre dos usuarios cualquiera apareciera mezclada en la bandeja de soporte
-- del admin. chat_direct_messages es su propio espacio, sin esa colision, y
-- ademas permite bloquear el envio a nivel de base cuando el receptor bloqueo
-- al emisor (chat_user_blocks se crea en la migracion 079).

CREATE TABLE IF NOT EXISTS public.chat_direct_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_direct_messages_conversation_idx
ON public.chat_direct_messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at);

CREATE INDEX IF NOT EXISTS chat_direct_messages_receiver_unread_idx
ON public.chat_direct_messages (receiver_id, is_read);

ALTER TABLE public.chat_direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own direct messages" ON public.chat_direct_messages;
CREATE POLICY "Users read their own direct messages"
ON public.chat_direct_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users send direct messages as themselves" ON public.chat_direct_messages;
CREATE POLICY "Users send direct messages as themselves"
ON public.chat_direct_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver marks direct messages read" ON public.chat_direct_messages;
CREATE POLICY "Receiver marks direct messages read"
ON public.chat_direct_messages
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_direct_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_direct_messages';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
