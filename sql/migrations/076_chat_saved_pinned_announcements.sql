-- Query permanente
-- Dominio: chat
-- Objetivo: mensajes guardados por usuario, mensajes fijados por staff,
--           anuncios para todos y conteo de mensajes sin leer.

-- Un anuncio (@todos) tiene que llegarle a cualquiera, aunque no estuviera
-- conectado cuando se escribio. Se marca en la propia fila para poder buscar
-- los pendientes al iniciar sesion.
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_announcement boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS chat_messages_announcement_idx
ON public.chat_messages (created_at DESC)
WHERE is_announcement;

-- Guardados: privados de cada usuario, no los ve nadie mas.
CREATE TABLE IF NOT EXISTS public.chat_saved_messages (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS chat_saved_messages_user_idx
ON public.chat_saved_messages (user_id, created_at DESC);

-- Fijados: uno por mensaje, con vencimiento. Solo staff puede crearlos.
CREATE TABLE IF NOT EXISTS public.chat_pinned_messages (
  message_id uuid PRIMARY KEY REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pinned_until timestamptz NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_pinned_messages_room_idx
ON public.chat_pinned_messages (room_id, pinned_until DESC);

ALTER TABLE public.chat_saved_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own saved messages" ON public.chat_saved_messages;
CREATE POLICY "Users read their own saved messages"
ON public.chat_saved_messages
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users save their own messages" ON public.chat_saved_messages;
CREATE POLICY "Users save their own messages"
ON public.chat_saved_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users unsave their own messages" ON public.chat_saved_messages;
CREATE POLICY "Users unsave their own messages"
ON public.chat_saved_messages
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users read pinned messages" ON public.chat_pinned_messages;
CREATE POLICY "Authenticated users read pinned messages"
ON public.chat_pinned_messages
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff pin messages" ON public.chat_pinned_messages;
CREATE POLICY "Staff pin messages"
ON public.chat_pinned_messages
FOR INSERT
WITH CHECK (
  auth.uid() = pinned_by
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Staff unpin messages" ON public.chat_pinned_messages;
CREATE POLICY "Staff unpin messages"
ON public.chat_pinned_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

-- Solo el staff puede marcar un mensaje como anuncio. Sin esto cualquiera
-- podria insertar is_announcement = true y avisarle a toda la plataforma.
CREATE OR REPLACE FUNCTION public.enforce_chat_announcement_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_announcement AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.user_id
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  ) THEN
    RAISE EXCEPTION 'Solo un administrador o helper puede enviar un anuncio';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_chat_announcement ON public.chat_messages;
CREATE TRIGGER trigger_enforce_chat_announcement
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_announcement_privileges();

-- La limpieza de 48 horas ahora respeta lo que alguien guardo, lo que esta
-- fijado y los anuncios: si se borraran, "guardar" y "fijar" no servirian de
-- nada pasados dos dias.
CREATE OR REPLACE FUNCTION public.clean_old_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_messages m
  WHERE m.room_id = NEW.room_id
    AND m.created_at < now() - interval '48 hours'
    AND NOT m.is_announcement
    AND NOT EXISTS (SELECT 1 FROM public.chat_saved_messages s WHERE s.message_id = m.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_pinned_messages p
      WHERE p.message_id = m.id AND p.pinned_until > now()
    );

  RETURN NEW;
END;
$$;

-- Conteo de pendientes para el badge del menu.
CREATE OR REPLACE FUNCTION public.count_unread_chat_messages()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.chat_messages m
  LEFT JOIN public.chat_room_reads r
    ON r.room_id = m.room_id
   AND r.user_id = auth.uid()
  WHERE m.user_id <> auth.uid()
    AND m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz);
$$;

REVOKE ALL ON FUNCTION public.count_unread_chat_messages() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.count_unread_chat_messages() TO authenticated;

-- Anuncios que el usuario todavia no vio, para avisarle al conectarse.
CREATE OR REPLACE FUNCTION public.pending_chat_announcements()
RETURNS SETOF public.chat_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.*
  FROM public.chat_messages m
  LEFT JOIN public.chat_room_reads r
    ON r.room_id = m.room_id
   AND r.user_id = auth.uid()
  WHERE m.is_announcement
    AND m.user_id <> auth.uid()
    AND m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  ORDER BY m.created_at;
$$;

REVOKE ALL ON FUNCTION public.pending_chat_announcements() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pending_chat_announcements() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_pinned_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_pinned_messages';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
