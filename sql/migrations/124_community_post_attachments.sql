-- 124 - Imagenes en publicaciones del foro
--
-- Mismo modelo relacional que chat_message_attachments (migracion 085), pero
-- sin la parte de storage: el bucket y sus policies de storage.objects los
-- resuelve otro agente en otra migracion. Esta solo define la tabla, sus
-- policies de fila y el orden de las imagenes dentro del post.
--
-- ## position: 'top' | 'bottom'
--
-- Una publicacion del foro tiene titulo + cuerpo de texto; las imagenes se
-- anclan antes o despues de ese cuerpo, no intercaladas linea por linea como
-- en un editor WYSIWYG (el body sigue siendo texto plano con CHECK de
-- longitud en community_posts, no HTML/Markdown con imagenes embebidas). Dos
-- posiciones alcanzan para "encabezado visual" (top) y "capturas de
-- resultado" (bottom), que son los dos usos reales que se esperan del foro
-- interno. Si mas adelante hace falta intercalar imagenes dentro del cuerpo,
-- eso es un cambio de editor (a Markdown/rich text), no de este esquema.
--
-- `sort_order` desempata cuando hay mas de una imagen en la misma posicion.

CREATE TABLE IF NOT EXISTS public.community_post_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position text NOT NULL DEFAULT 'bottom' CHECK (position IN ('top', 'bottom')),
  sort_order int NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  width integer,
  height integer,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Consulta real: "las imagenes de este post, en el orden en que se dibujan".
-- position primero porque la UI arma dos bloques separados (arriba/abajo del
-- cuerpo); sort_order desempata dentro de cada bloque.
CREATE INDEX IF NOT EXISTS community_post_attachments_post_position_idx
ON public.community_post_attachments (post_id, position, sort_order);

ALTER TABLE public.community_post_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read post attachments" ON public.community_post_attachments;
CREATE POLICY "Authenticated users read post attachments"
ON public.community_post_attachments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Solo el autor de la publicacion puede adjuntarle imagenes, y solo en
-- nombre propio: mismo patron que chat_message_attachments, que exige que
-- quien sube sea quien escribio el mensaje al que se adjunta.
DROP POLICY IF EXISTS "Authors attach images to their own posts" ON public.community_post_attachments;
CREATE POLICY "Authors attach images to their own posts"
ON public.community_post_attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploader_id
  AND EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = post_id AND p.author_id = auth.uid()
  )
);

-- Borrar un adjunto (para reordenar o corregir un post) queda para el autor
-- o staff, igual que el resto de la moderacion del foro.
DROP POLICY IF EXISTS "Authors or staff delete post attachments" ON public.community_post_attachments;
CREATE POLICY "Authors or staff delete post attachments"
ON public.community_post_attachments
FOR DELETE
USING (
  auth.uid() = uploader_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

GRANT SELECT, INSERT, DELETE ON public.community_post_attachments TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_post_attachments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_attachments';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
