-- Query permanente
-- Dominio: chat
-- Objetivo: adjuntar imagenes y documentos a los mensajes de la sala.
--
-- Las imagenes se convierten a WebP y se redimensionan en el cliente antes de
-- subir (canvas -> toBlob), asi que lo que llega al bucket ya es la version
-- liviana que se muestra tanto en la miniatura del chat como al abrirla en
-- grande -- no se guarda el archivo original de mayor resolucion.
--
-- El bucket es publico (mismo criterio que 'avatars' en la migracion 005):
-- la sala de chat ya es de lectura abierta a cualquier autenticado, asi que
-- no suma restriccion real ocultar los archivos detras de URLs firmadas.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', true, 3145728) -- 3 MB
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_attachments_public_read" ON storage.objects;
CREATE POLICY "chat_attachments_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "chat_attachments_owner_insert" ON storage.objects;
CREATE POLICY "chat_attachments_owner_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "chat_attachments_owner_delete" ON storage.objects;
CREATE POLICY "chat_attachments_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image', 'file')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  width integer,
  height integer,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_message_attachments_room_kind_idx
ON public.chat_message_attachments (room_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_message_attachments_message_idx
ON public.chat_message_attachments (message_id);

ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read attachments" ON public.chat_message_attachments;
CREATE POLICY "Authenticated users read attachments"
ON public.chat_message_attachments
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users attach files to their own messages" ON public.chat_message_attachments;
CREATE POLICY "Users attach files to their own messages"
ON public.chat_message_attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploader_id
  AND EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id AND m.user_id = auth.uid()
  )
);

-- Al limpiarse un mensaje viejo (o borrarse por moderacion), sus adjuntos
-- caen por ON DELETE CASCADE, pero eso solo borra la fila -- el archivo real
-- sigue viviendo en storage.objects. Este trigger lo borra tambien, para que
-- la retencion de 30 dias sea real y no deje archivos huerfanos.
CREATE OR REPLACE FUNCTION public.delete_chat_attachment_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'chat-attachments'
    AND name = OLD.storage_path;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_chat_attachment_object ON public.chat_message_attachments;
CREATE TRIGGER trigger_delete_chat_attachment_object
AFTER DELETE ON public.chat_message_attachments
FOR EACH ROW EXECUTE FUNCTION public.delete_chat_attachment_object();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_message_attachments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
