-- Query permanente
-- Dominio: comunidad
-- Objetivo: reemplazar el chat global de comunidad por un foro con publicaciones,
--           categorias, me gusta y comentarios.
--
-- Antes la seccion reutilizaba internal_messages con receiver_id IS NULL como
-- convencion de "mensaje publico", compartiendo tabla con la mensajeria privada
-- de soporte. Eso acoplaba dos dominios y hacia que el canal realtime de
-- comunidad recibiera tambien inserciones de conversaciones privadas.
-- internal_messages queda intacta para soporte; el foro vive en tablas propias.

CREATE TABLE IF NOT EXISTS public.community_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.community_categories(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  -- Contadores desnormalizados: evitan un COUNT por fila al listar el feed.
  -- Los mantienen los triggers de mas abajo.
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS community_posts_created_idx
ON public.community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_category_created_idx
ON public.community_posts (category_id, created_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_author_idx
ON public.community_posts (author_id);

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_post_likes_user_idx
ON public.community_post_likes (user_id);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS community_comments_post_created_idx
ON public.community_comments (post_id, created_at);

CREATE OR REPLACE FUNCTION public.community_sync_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET likes_count = greatest(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_community_post_like_count ON public.community_post_likes;
CREATE TRIGGER trigger_community_post_like_count
AFTER INSERT OR DELETE ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION public.community_sync_post_like_count();

CREATE OR REPLACE FUNCTION public.community_sync_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comments_count = greatest(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_community_post_comment_count ON public.community_comments;
CREATE TRIGGER trigger_community_post_comment_count
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.community_sync_post_comment_count();

-- Relacion calculada hacia profiles_public, mismo recurso que sender_profile en
-- la migracion 059: permite embeber el perfil del autor sin exponer la tabla
-- profiles ni hacer una consulta por fila.
CREATE OR REPLACE FUNCTION public.author_profile(public.community_posts)
RETURNS SETOF public.profiles_public
ROWS 1
LANGUAGE sql
STABLE
AS $fn$
  SELECT pp.* FROM public.profiles_public pp WHERE pp.id = $1.author_id;
$fn$;

CREATE OR REPLACE FUNCTION public.author_profile(public.community_comments)
RETURNS SETOF public.profiles_public
ROWS 1
LANGUAGE sql
STABLE
AS $fn$
  SELECT pp.* FROM public.profiles_public pp WHERE pp.id = $1.author_id;
$fn$;

COMMENT ON FUNCTION public.author_profile(public.community_posts) IS
  'Relacion calculada para PostgREST: perfil publico del autor de la publicacion.';

COMMENT ON FUNCTION public.author_profile(public.community_comments) IS
  'Relacion calculada para PostgREST: perfil publico del autor del comentario.';

ALTER TABLE public.community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read community categories" ON public.community_categories;
CREATE POLICY "Authenticated users read community categories"
ON public.community_categories
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff manage community categories" ON public.community_categories;
CREATE POLICY "Staff manage community categories"
ON public.community_categories
FOR ALL
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

DROP POLICY IF EXISTS "Authenticated users read community posts" ON public.community_posts;
CREATE POLICY "Authenticated users read community posts"
ON public.community_posts
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users insert own community posts" ON public.community_posts;
CREATE POLICY "Users insert own community posts"
ON public.community_posts
FOR INSERT
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors or staff update community posts" ON public.community_posts;
CREATE POLICY "Authors or staff update community posts"
ON public.community_posts
FOR UPDATE
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
)
WITH CHECK (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Authors or staff delete community posts" ON public.community_posts;
CREATE POLICY "Authors or staff delete community posts"
ON public.community_posts
FOR DELETE
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Authenticated users read community likes" ON public.community_post_likes;
CREATE POLICY "Authenticated users read community likes"
ON public.community_post_likes
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users insert own community likes" ON public.community_post_likes;
CREATE POLICY "Users insert own community likes"
ON public.community_post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own community likes" ON public.community_post_likes;
CREATE POLICY "Users delete own community likes"
ON public.community_post_likes
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users read community comments" ON public.community_comments;
CREATE POLICY "Authenticated users read community comments"
ON public.community_comments
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users insert own community comments" ON public.community_comments;
CREATE POLICY "Users insert own community comments"
ON public.community_comments
FOR INSERT
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors or staff delete community comments" ON public.community_comments;
CREATE POLICY "Authors or staff delete community comments"
ON public.community_comments
FOR DELETE
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

-- Tendencia: se calcula al leer en vez de cachearse en columna. El volumen es
-- el de un foro interno, no un feed masivo, y asi no hace falta un job que
-- recalcule el puntaje al pasar el tiempo. El divisor por antiguedad hace que
-- una publicacion vieja con muchos me gusta ceda lugar a una reciente activa.
CREATE OR REPLACE VIEW public.community_posts_trending
WITH (security_invoker = true)
AS
SELECT
  p.*,
  (p.likes_count * 2 + p.comments_count * 3)::numeric
    / power((extract(epoch FROM (now() - p.created_at)) / 3600.0) + 2, 1.5) AS trending_score
FROM public.community_posts p
WHERE p.created_at > now() - interval '72 hours';

GRANT SELECT ON public.community_posts_trending TO authenticated;

INSERT INTO public.community_categories (slug, name, description, icon, sort_order) VALUES
  ('general',   'General',            'Charla libre y presentaciones',     'Messages', 0),
  ('tips',      'Tips y estrategias', 'Consejos para vender mas',          'Bullseye', 1),
  ('preguntas', 'Preguntas',          'Dudas sobre la plataforma',         'Help',     2),
  ('anuncios',  'Anuncios',           'Novedades del equipo LeadSeed',     'Bell',     3)
ON CONFLICT (slug) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_comments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_post_likes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_likes';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
