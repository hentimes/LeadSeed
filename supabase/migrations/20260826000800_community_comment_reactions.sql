-- 128 - Reacciones en los comentarios del foro
--
-- ## Por que esto existe aparte de la 122
--
-- La 122 hace dos cosas a la vez: crea las reacciones de PUBLICACIONES -y para
-- eso borra `community_post_likes`, que es irreversible- y crea las de
-- COMENTARIOS, que no destruye nada.
--
-- Se pidieron las de comentarios, y no habia motivo para que arrastraran un
-- `DROP TABLE` con ellas. Esta migracion extrae solo esa mitad. La 122 sigue
-- ahi para cuando se decida migrar los "me gusta" de las publicaciones.
--
-- Escrita para convivir con la 122: si algun dia se aplica, sus `IF NOT EXISTS`
-- y `CREATE OR REPLACE` encuentran esto ya hecho y siguen de largo.

CREATE TABLE IF NOT EXISTS public.community_comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍', '👎', '❤️')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (comment_id, user_id, emoji)
);

-- "Todas las reacciones de estos comentarios" es la consulta que se repite al
-- abrir una publicacion.
CREATE INDEX IF NOT EXISTS community_comment_reactions_comment_idx
ON public.community_comment_reactions (comment_id);

ALTER TABLE public.community_comment_reactions ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, DELETE ON public.community_comment_reactions TO authenticated;

-- Vista agregada: una fila por (comentario, emoji), igual que la del chat en la
-- 119. `user_ids` viaja para que el cliente sepa si ya reaccionaste sin una
-- segunda consulta; son ids que ya puede leer por la politica de SELECT.
CREATE OR REPLACE VIEW public.community_comment_reaction_summary AS
SELECT
  comment_id,
  emoji,
  count(*)::int AS count,
  array_agg(user_id) AS user_ids
FROM public.community_comment_reactions
GROUP BY comment_id, emoji;

GRANT SELECT ON public.community_comment_reaction_summary TO authenticated;

-- Una sola reaccion por persona y por comentario, mismo criterio que la 127
-- para el chat: elegir una reemplaza a la anterior.
CREATE OR REPLACE FUNCTION public.enforce_single_comment_reaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.community_comment_reactions
  WHERE comment_id = NEW.comment_id
    AND user_id = NEW.user_id
    AND emoji IS DISTINCT FROM NEW.emoji;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_single_comment_reaction ON public.community_comment_reactions;
CREATE TRIGGER trigger_enforce_single_comment_reaction
BEFORE INSERT ON public.community_comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_comment_reaction();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'community_comment_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comment_reactions';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
