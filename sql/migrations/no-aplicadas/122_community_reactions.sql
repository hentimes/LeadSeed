-- 122 - Reacciones (pulgar arriba, pulgar abajo, corazon) en publicaciones y comentarios
--
-- ## Que pasa con community_post_likes
--
-- Se MIGRA y se DESCARTA, no se conserva en paralelo. Conservar las dos deja
-- dos caminos para "me gusta un post" (la tabla vieja binaria y la nueva de
-- tres emojis) que hay que mantener sincronizados a mano; eso es la fuente de
-- bugs mas tipica de esta clase de migracion. `likes_count` en
-- community_posts NO se renombra ni cambia de significado: sigue siendo el
-- conteo de 👍 exclusivamente, para no romper la formula de tendencia de la
-- migracion 074 ni el codigo de frontend que ya ordena y muestra ese numero.
-- 👎 y ❤️ son señales nuevas, expuestas solo por la vista agregada.
--
-- ## Orden de esta migracion (importa para no descuadrar el contador)
--
-- 1. Crear community_post_reactions SIN trigger todavia.
-- 2. Backfill: cada fila de community_post_likes pasa a ser una reaccion 👍.
--    Como el trigger de conteo no existe aun, este insert no toca
--    likes_count -- que ya esta correcto porque lo mantuvo el trigger viejo
--    mientras community_post_likes estuvo activa.
-- 3. Recien ahi se crea el trigger nuevo, que de aca en mas solo reacciona a
--    altas/bajas de 👍 para mantener likes_count.
-- 4. community_post_likes se elimina. Es DESTRUCTIVO: correr el SELECT de
--    verificacion de abajo antes de aplicar en produccion.
--
-- ## Por que comentarios no llevan contador desnormalizado
--
-- Mismo criterio que chat_message_reactions (migracion 119): el volumen de
-- reacciones a comentarios de un foro interno no justifica un trigger mas un
-- campo a mantener sincronizado. La vista agregada del final resuelve el
-- conteo al leer.

CREATE TABLE IF NOT EXISTS public.community_post_reactions (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍', '👎', '❤️')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.community_comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍', '👎', '❤️')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, emoji)
);

-- ============================================================
-- ANTES DE SEGUIR: correr en produccion y revisar el resultado.
--
--   SELECT count(*) AS total_likes,
--          count(DISTINCT post_id) AS posts_con_like,
--          count(DISTINCT user_id) AS usuarios_que_dieron_like
--   FROM public.community_post_likes;
--
-- Confirmar que ese total es razonable (no deberia haber filas huerfanas: la
-- FK a community_posts y profiles ya lo garantiza). Si el numero sorprende,
-- pausar y revisar antes del backfill.
-- ============================================================

-- Backfill: sin trigger activo todavia, asi que likes_count no se altera.
INSERT INTO public.community_post_reactions (post_id, user_id, emoji, created_at)
SELECT post_id, user_id, '👍', created_at
FROM public.community_post_likes
ON CONFLICT (post_id, user_id, emoji) DO NOTHING;

-- Trigger de conteo: solo 👍 mueve la aguja de likes_count, a proposito.
CREATE OR REPLACE FUNCTION public.community_sync_post_thumbsup_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.emoji = '👍' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.emoji = '👍' THEN
    UPDATE public.community_posts SET likes_count = greatest(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_community_post_thumbsup_count ON public.community_post_reactions;
CREATE TRIGGER trigger_community_post_thumbsup_count
AFTER INSERT OR DELETE ON public.community_post_reactions
FOR EACH ROW EXECUTE FUNCTION public.community_sync_post_thumbsup_count();

-- DESTRUCTIVO: reemplaza community_post_likes. El backfill de arriba ya
-- corrio dentro de esta misma transaccion de migracion, asi que para cuando
-- se llega aca el dato ya esta duplicado en la tabla nueva.
DROP TRIGGER IF EXISTS trigger_community_post_like_count ON public.community_post_likes;
DROP FUNCTION IF EXISTS public.community_sync_post_like_count();
DROP TABLE IF EXISTS public.community_post_likes;

ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read post reactions" ON public.community_post_reactions;
CREATE POLICY "Authenticated users read post reactions"
ON public.community_post_reactions
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users insert own post reaction" ON public.community_post_reactions;
CREATE POLICY "Users insert own post reaction"
ON public.community_post_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own post reaction" ON public.community_post_reactions;
CREATE POLICY "Users delete own post reaction"
ON public.community_post_reactions
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users read comment reactions" ON public.community_comment_reactions;
CREATE POLICY "Authenticated users read comment reactions"
ON public.community_comment_reactions
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users insert own comment reaction" ON public.community_comment_reactions;
CREATE POLICY "Users insert own comment reaction"
ON public.community_comment_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comment reaction" ON public.community_comment_reactions;
CREATE POLICY "Users delete own comment reaction"
ON public.community_comment_reactions
FOR DELETE
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.community_post_reactions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_comment_reactions TO authenticated;

-- Vistas agregadas: una fila por (entidad, emoji), igual que
-- chat_message_reaction_summary en la 119. `user_ids` viaja para que el
-- cliente sepa si el usuario actual ya reacciono, sin una segunda consulta.
CREATE OR REPLACE VIEW public.community_post_reaction_summary AS
SELECT post_id, emoji, count(*)::int AS count, array_agg(user_id) AS user_ids
FROM public.community_post_reactions
GROUP BY post_id, emoji;

CREATE OR REPLACE VIEW public.community_comment_reaction_summary AS
SELECT comment_id, emoji, count(*)::int AS count, array_agg(user_id) AS user_ids
FROM public.community_comment_reactions
GROUP BY comment_id, emoji;

GRANT SELECT ON public.community_post_reaction_summary TO authenticated;
GRANT SELECT ON public.community_comment_reaction_summary TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_post_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_reactions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_comment_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comment_reactions';
  END IF;

  -- community_post_likes se elimino en esta misma migracion: si seguia dado
  -- de alta en la publicacion, sacarlo evita un error de PostgREST al
  -- refrescar el esquema.
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_post_likes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.community_post_likes';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
