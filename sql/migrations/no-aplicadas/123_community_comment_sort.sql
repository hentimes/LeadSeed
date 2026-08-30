-- 123 - Orden de comentarios: recientes, antiguos, relevancia
--
-- ## Por que funcion y no vista ni ORDER BY en el cliente
--
-- El orden depende de un parametro ('recent' | 'oldest' | 'relevance'), y una
-- vista de PostgREST no recibe argumentos: harian falta tres vistas casi
-- identicas o un query param que la vista no puede leer. Ordenar en el
-- cliente (traer todo y hacer .sort() en TypeScript) obliga a bajar todos los
-- comentarios igual y descarta la ventaja de que Postgres ya sabe agregar
-- reacciones y contar respuestas sin round-trips extra; con el volumen de un
-- hilo de foro interno el join no es un problema, pero repetirlo en cada
-- cliente si. Una funcion SQL con parametro es la pieza que falta entre las
-- dos: un solo viaje de red, misma firma que espera communityForumRepository.
--
-- ## Como interactua el orden con el anidamiento
--
-- El orden SIEMPRE agrupa por hilo raiz primero. 'relevance' y 'recent'
-- ordenan que hilo aparece arriba, no que respuesta individual aparece
-- arriba: una respuesta hereda la posicion de su comentario raiz (via
-- root_id) y, dentro del mismo hilo, las filas quedan en orden cronologico
-- ascendente por `created_at`. Es la misma logica que un hilo de Slack: se
-- decide que conversacion importa mas, no se desordena la conversacion en si.
-- Alternativa descartada: ordenar cada respuesta de forma independiente por
-- relevancia -- eso rompe la lectura de la conversacion, una respuesta
-- popular saltaria antes que la pregunta que contesta.
--
-- ## Formula de relevancia
--
-- Mismo criterio que community_posts_trending (migracion 074): pondera
-- interaccion (reacciones positivas del comentario raiz x2, cantidad de
-- respuestas del hilo x3 porque conversar pesa mas que reaccionar) y divide
-- por la antiguedad para que un hilo viejo con mucha actividad ceda lugar a
-- uno reciente y activo. El exponente es mas chico que en community_posts_trending
-- (1.2 contra 1.5) porque un hilo de comentarios vive minutos u horas, no dias;
-- una caida demasiado agresiva dejaria todo en el mismo orden que 'recent'.
--
-- root_created_at se resuelve con min(created_at) OVER (PARTITION BY root_id)
-- en vez de un segundo self-join: el comentario raiz siempre es el mas viejo
-- de su propio hilo, asi que el minimo de la particion ES su fecha sin tener
-- que volver a buscar la fila.

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
    -- Con el tope de 2 en `depth` (migracion 121), resolver el ancestro raiz
    -- es un solo LEFT JOIN, no una CTE recursiva: alcanza con mirar el padre
    -- del padre para el caso de depth = 2.
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
    SELECT comment_id, count(*) FILTER (WHERE emoji IN ('👍', '❤️')) AS thumbs
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

COMMENT ON FUNCTION public.community_comments_feed(uuid, text) IS
  'Comentarios de una publicacion en un solo viaje, agrupados por hilo raiz segun p_sort (recent | oldest | relevance) y cronologicos dentro de cada hilo.';

-- SECURITY INVOKER (el default, pero explicito): la funcion no eleva
-- privilegios, corre con el rol de quien llama y por lo tanto respeta las
-- policies de SELECT de community_comments y community_comment_reactions que
-- ya existen. No hace falta duplicar la logica de RLS aca adentro.
GRANT EXECUTE ON FUNCTION public.community_comments_feed(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
