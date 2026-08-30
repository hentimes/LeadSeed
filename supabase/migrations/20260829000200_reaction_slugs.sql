-- reaction_slugs
--
-- Tipo:           query permanente (renombre de columna + conversion de datos)
-- Objeto:         public.chat_message_reactions, public.community_post_reactions,
--                 public.community_comment_reactions y todo lo que depende de su
--                 columna `emoji`
-- Clase:          correccion de modelo
-- Persistencia:   permanente
-- Reversibilidad: total (la migracion inversa es simetrica y no pierde datos)
--
-- PROPOSITO
--
-- La clave de una reaccion era el propio caracter del emoji, guardado en una
-- columna llamada `emoji`, con `CHECK (emoji IN ('...'))` y formando parte de la
-- CLAVE PRIMARIA de las tres tablas. Se cambia por un identificador estable:
-- `like`, `dislike`, `love`.
--
-- Hay dos motivos, y el segundo es el que de verdad importa.
--
-- 1. El protocolo CONTROL 10.1.a prohibe todo emoji escrito en el codigo por un
--    desarrollador, e incluye explicitamente los "valores centinela, fingerprints
--    o marcas internas aunque nunca se rendericen". Estos nunca se dibujan -la
--    interfaz pinta un icono- pero estaban escritos en el codigo y en el esquema.
--
-- 2. Un emoji NO es un identificador estable. El corazon se escribe con dos
--    puntos de codigo, U+2764 seguido del selector de variacion U+FE0F. Un
--    cliente que mande U+2764 a secas produce una cadena distinta: otra fila,
--    otra clave primaria, y con el CHECK puesto, un rechazo que nadie sabria
--    explicar. Lo mismo vale para cualquier normalizacion Unicode que se
--    interponga en el camino. Una clave primaria no puede depender de eso.
--
-- QUE SE CONVIERTE
--
--   U+1F44D  ->  'like'
--   U+1F44E  ->  'dislike'
--   U+2764 U+FE0F  ->  'love'
--
-- La columna pasa a llamarse `reaction`, porque despues de esto ya no guarda un
-- emoji y dejarle el nombre viejo seria mentir en el esquema.
--
-- DEPENDENCIAS QUE HAY QUE RECREAR
--
-- El renombre de una columna en PostgreSQL NO reescribe el cuerpo de las
-- funciones, que se guarda como texto: quedarian rotas en ejecucion. Y las
-- vistas mantienen el nombre de su columna de salida, asi que `CREATE OR REPLACE
-- VIEW` no alcanza -no puede cambiar nombres de columna- y hay que soltarlas y
-- volver a crearlas.
--
-- Por eso esta migracion toca ademas:
--
--   vistas     chat_message_reaction_summary        (119)
--              community_post_reaction_summary      (122)
--              community_comment_reaction_summary   (122, recreada en la 128)
--   funciones  enforce_single_chat_reaction         (127)
--              enforce_single_comment_reaction      (128)
--              community_sync_post_thumbsup_count   (122)
--              community_comments_feed              (123)
--
-- POR QUE ES DEFENSIVA
--
-- `community_post_reactions` existe en `sql/migrations/122` pero **no en la base
-- desplegada**: la 122 nunca se espejo a `supabase/migrations/` ni se aplico, y
-- el codigo sigue usando la tabla anterior, `community_post_likes`. Se descubrio
-- al intentar aplicar esta migracion, que fallo entera y revirtio.
--
-- Asi que cada tabla se toca solo si existe, con `to_regclass`. La alternativa
-- -aplicar la 122 ahora para "emparejar"- seria peor: la 122 es DESTRUCTIVA,
-- reemplaza `community_post_likes`, y esa decision no se toma de paso dentro de
-- otra migracion.
--
-- Cuando se resuelva que hacer con la 122, esta migracion ya habra dejado el
-- resto convertido y la tabla nueva nacera con los identificadores correctos.
--
-- IMPACTO
--
-- El cliente que este abierto durante el despliegue dejara de poder reaccionar
-- hasta que recargue, porque manda el emoji viejo y el CHECK nuevo lo rechaza.
-- Es una recarga, no una perdida: ninguna reaccion existente se borra.

-- ---------------------------------------------------------------------------
-- 1. Fuera las vistas, que bloquean el renombre del nombre de salida
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.chat_message_reaction_summary;
DROP VIEW IF EXISTS public.community_post_reaction_summary;
DROP VIEW IF EXISTS public.community_comment_reaction_summary;

-- ---------------------------------------------------------------------------
-- 2. Las tres tablas: soltar el CHECK, renombrar, convertir, volver a atar
-- ---------------------------------------------------------------------------
--
-- El CHECK se suelta ANTES de convertir: si no, el primer UPDATE a 'like'
-- violaria la restriccion vieja y la migracion se caeria entera.

-- Un bloque por tabla, y cada uno comprueba dos cosas por separado: que la
-- tabla exista, y que la columna todavia se llame `emoji`. Lo segundo hace la
-- migracion repetible: si se corta a la mitad, volver a lanzarla no falla.
DO $migracion$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'chat_message_reactions',
    'community_post_reactions',
    'community_comment_reactions'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'La tabla % no existe en esta base; se omite.', t;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'emoji'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_emoji_check');
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN emoji TO reaction', t);
      EXECUTE format($sql$
        UPDATE public.%I SET reaction = CASE reaction
          WHEN '👍' THEN 'like'
          WHEN '👎' THEN 'dislike'
          WHEN '❤️' THEN 'love'
          ELSE reaction
        END
      $sql$, t);
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_reaction_check');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (reaction IN (''like'', ''dislike'', ''love''))',
      t, t || '_reaction_check');
  END LOOP;
END
$migracion$;

COMMENT ON COLUMN public.chat_message_reactions.reaction IS
  'Identificador estable de la reaccion: like, dislike o love. No es el emoji: la interfaz decide que glifo dibuja.';
COMMENT ON COLUMN public.community_comment_reactions.reaction IS
  'Identificador estable de la reaccion: like, dislike o love.';

-- ---------------------------------------------------------------------------
-- 3. Las vistas, otra vez
-- ---------------------------------------------------------------------------

CREATE VIEW public.chat_message_reaction_summary AS
SELECT
  message_id,
  reaction,
  count(*)::int AS count,
  array_agg(user_id) AS user_ids
FROM public.chat_message_reactions
GROUP BY message_id, reaction;

CREATE VIEW public.community_comment_reaction_summary AS
SELECT comment_id, reaction, count(*)::int AS count, array_agg(user_id) AS user_ids
FROM public.community_comment_reactions
GROUP BY comment_id, reaction;

GRANT SELECT ON public.chat_message_reaction_summary TO authenticated;
GRANT SELECT ON public.community_comment_reaction_summary TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Las funciones, con el nombre y los valores nuevos
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_single_chat_reaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.chat_message_reactions
  WHERE message_id = NEW.message_id
    AND user_id = NEW.user_id
    AND reaction IS DISTINCT FROM NEW.reaction;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_single_comment_reaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.community_comment_reactions
  WHERE comment_id = NEW.comment_id
    AND user_id = NEW.user_id
    AND reaction IS DISTINCT FROM NEW.reaction;

  RETURN NEW;
END;
$$;

-- Solo `like` mueve la aguja de likes_count, igual que antes solo lo hacia el
-- pulgar arriba. Se recrea aunque su tabla no exista todavia: una funcion sin
-- trigger no molesta, y asi queda lista si algun dia se aplica la 122.
CREATE OR REPLACE FUNCTION public.community_sync_post_thumbsup_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reaction = 'like' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reaction = 'like' THEN
    UPDATE public.community_posts SET likes_count = greatest(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Identica a la de la 123 salvo el FILTER de `root_reactions`, que pasa de
-- comparar emojis a comparar identificadores.
CREATE OR REPLACE FUNCTION public.community_comments_feed(p_post_id uuid, p_sort text DEFAULT 'recent')
RETURNS TABLE (
  id uuid,
  post_id uuid,
  parent_id uuid,
  depth smallint,
  root_id uuid,
  author_id uuid,
  body text,
  created_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH tree AS (
    SELECT
      c.*,
      CASE
        WHEN c.depth = 0 THEN c.id
        WHEN c.depth = 1 THEN c.parent_id
        ELSE p1.parent_id
      END AS root_id
    FROM public.community_comments c
    LEFT JOIN public.community_comments p1 ON p1.id = c.parent_id AND c.depth = 2
    WHERE c.post_id = p_post_id
  ),
  scored AS (
    SELECT
      tree.*,
      count(*) OVER (PARTITION BY tree.root_id) - 1 AS reply_count,
      min(tree.created_at) OVER (PARTITION BY tree.root_id) AS root_created_at
    FROM tree
  ),
  root_reactions AS (
    SELECT comment_id, count(*) FILTER (WHERE reaction IN ('like', 'love')) AS thumbs
    FROM public.community_comment_reactions
    WHERE comment_id IN (SELECT id FROM tree WHERE depth = 0)
    GROUP BY comment_id
  )
  SELECT
    s.id, s.post_id, s.parent_id, s.depth, s.root_id,
    s.author_id, s.body, s.created_at, s.deleted_at
  FROM scored s
  LEFT JOIN root_reactions r ON r.comment_id = s.root_id
  ORDER BY
    CASE WHEN p_sort = 'relevance' THEN
      (coalesce(r.thumbs, 0) * 2 + s.reply_count * 3)::numeric
        / power((extract(epoch FROM (now() - s.root_created_at)) / 3600.0) + 2, 1.2)
    END DESC NULLS LAST,
    CASE WHEN p_sort = 'oldest' THEN s.root_created_at END ASC,
    CASE WHEN p_sort IS NULL OR p_sort NOT IN ('relevance', 'oldest') THEN s.root_created_at END DESC,
    s.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.community_comments_feed(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
