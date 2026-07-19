-- Query permanente
-- Dominio: chat
-- Objetivo: crear salas de chat volatiles con retencion de 48 horas, perfiles resolubles y realtime

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 120),
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_room_id_created_at_idx
ON public.chat_messages (room_id, created_at);

CREATE INDEX IF NOT EXISTS chat_messages_reply_to_id_idx
ON public.chat_messages (reply_to_id);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read chat rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated users can read chat rooms"
ON public.chat_rooms
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and helpers can create chat rooms" ON public.chat_rooms;
CREATE POLICY "Admins and helpers can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Admins and helpers can update chat rooms" ON public.chat_rooms;
CREATE POLICY "Admins and helpers can update chat rooms"
ON public.chat_rooms
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Authenticated users can read chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can read chat messages"
ON public.chat_messages
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert own chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can insert own chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.clean_old_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_messages
  WHERE room_id = NEW.room_id
    AND created_at < now() - interval '48 hours';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_clean_old_chat_messages ON public.chat_messages;
CREATE TRIGGER trigger_clean_old_chat_messages
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.clean_old_chat_messages();

INSERT INTO public.chat_rooms (name)
VALUES ('General')
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_rooms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
