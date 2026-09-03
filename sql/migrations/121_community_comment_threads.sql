-- 121 - Hilos de comentarios en el foro de comunidad
--
-- ## Por que parent_id y no ltree ni tabla de cierre
--
-- Este es un foro interno de una extension, no Reddit: se estima un puñado de
-- comentarios por publicacion, no miles. ltree agrega una extension, un tipo
-- de dato y un formato de path que hay que mantener sincronizado a mano en
-- cada insert; una tabla de cierre (closure table) agrega una tabla mas y un
-- trigger que inserta O(profundidad) filas por comentario. Las dos resuelven
-- un problema de escala que esta base no tiene. `parent_id` autorreferencial
-- es la opcion mas simple que ya se usa en el resto del proyecto (ver
-- internal_messages) y alcanza sobrado para armar el arbol en el cliente con
-- una sola consulta ordenada.
--
-- ## Por que la profundidad se limita con CHECK y no con trigger ni solo UI
--
-- Se limita a 3 niveles (post -> comentario raiz -> respuesta -> respuesta a
-- la respuesta). Mas que eso es ilegible en un panel de 320px, que es el
-- ancho real de este componente.
--
-- La UI-only se descarta: cualquier insert directo via API (Supabase expone
-- REST) se saltearia el limite y dejaria un hilo de nivel 8 que el cliente
-- ya no sabe donde ni como indentar.
--
-- Un trigger que recorra la cadena de parent_id hacia arriba contando niveles
-- es la alternativa correcta si la profundidad maxima fuera dinamica o
-- configurable, pero acá es una constante de producto. Guardar `depth` como
-- columna calculada en el insert y limitarla con un CHECK es una sola
-- comparacion en vez de un recorrido recursivo en cada escritura, y el CHECK
-- corre sin importar el camino de entrada.
--
-- `depth` se calcula en un trigger BEFORE INSERT (no puede ir en el CHECK
-- directamente porque depende de una consulta a la fila padre), pero el limite
-- en si lo impone el CHECK sobre la columna ya resuelta.

ALTER TABLE public.community_comments
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS depth smallint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.community_comments
DROP CONSTRAINT IF EXISTS community_comments_depth_check;

ALTER TABLE public.community_comments
ADD CONSTRAINT community_comments_depth_check CHECK (depth BETWEEN 0 AND 2);

COMMENT ON COLUMN public.community_comments.depth IS
  '0 = comentario raiz, 1 = respuesta, 2 = respuesta a una respuesta. Tope duro: un panel de 320px no rinde mas niveles.';

-- Un padre y su hijo deben pertenecer al mismo post: sin esto, una respuesta
-- podria colgar de un comentario de otra publicacion via un insert manual.
CREATE OR REPLACE FUNCTION public.community_comment_set_depth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_depth smallint;
  parent_post_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
    RETURN NEW;
  END IF;

  SELECT depth, post_id INTO parent_depth, parent_post_id
  FROM public.community_comments
  WHERE id = NEW.parent_id;

  IF parent_post_id IS NULL THEN
    RAISE EXCEPTION 'El comentario padre no existe';
  END IF;

  IF parent_post_id <> NEW.post_id THEN
    RAISE EXCEPTION 'El comentario padre pertenece a otra publicacion';
  END IF;

  NEW.depth := parent_depth + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_community_comment_set_depth ON public.community_comments;
CREATE TRIGGER trigger_community_comment_set_depth
BEFORE INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.community_comment_set_depth();

-- Consulta real que resuelve esto: "todos los comentarios de un post, para
-- armar el arbol en el cliente en una sola pasada". El indice ordena por
-- parent_id primero porque el cliente agrupa por padre al reconstruir el
-- arbol; created_at como segunda columna deja las respuestas de un mismo
-- padre ya en orden cronologico sin un sort aparte en memoria.
DROP INDEX IF EXISTS community_comments_post_created_idx;
CREATE INDEX IF NOT EXISTS community_comments_post_parent_created_idx
ON public.community_comments (post_id, parent_id, created_at);

-- Tombstone en vez de CASCADE real de contenido: si se permite borrar un
-- comentario con respuestas, un DELETE se llevaria el hilo entero, y quien
-- respondio pierde su aporte por una decision ajena. `chat_messages` ya
-- resuelve el mismo dilema con `deleted_at` (ver migracion de moderacion del
-- chat): la fila se conserva, el body deja de mostrarse y las respuestas
-- siguen colgando de un nodo valido. El ON DELETE CASCADE de la FK sigue
-- existiendo para cuando se borra la PUBLICACION entera (ahi si se quiere
-- limpiar todo) o el AUTOR (baja de cuenta).
CREATE OR REPLACE FUNCTION public.community_soft_delete_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  is_staff boolean;
BEGIN
  SELECT (author_id = auth.uid()) INTO is_owner
  FROM public.community_comments WHERE id = p_comment_id;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  ) INTO is_staff;

  IF NOT (coalesce(is_owner, false) OR is_staff) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.community_comments
  SET body = '[comentario eliminado]', deleted_at = now()
  WHERE id = p_comment_id AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.community_soft_delete_comment(uuid) TO authenticated;

-- La politica de DELETE fisico de la 074 se restringe: ahora solo borra un
-- comentario sin respuestas (hoja del arbol). Con respuestas, el camino es el
-- RPC de arriba. Sin esta restriccion, un autor podria seguir usando el
-- DELETE directo de PostgREST y saltear el tombstone.
DROP POLICY IF EXISTS "Authors or staff delete community comments" ON public.community_comments;
CREATE POLICY "Authors or staff delete community comments"
ON public.community_comments
FOR DELETE
USING (
  NOT EXISTS (SELECT 1 FROM public.community_comments c WHERE c.parent_id = community_comments.id)
  AND (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
    )
  )
);

NOTIFY pgrst, 'reload schema';
