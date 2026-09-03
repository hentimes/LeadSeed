-- Query permanente
-- Dominio: comunidad / integridad de los hilos de comentarios
-- Objeto: public.community_comments (trigger BEFORE UPDATE)
-- Clase: trigger + comentario de politica
-- Descripcion: congela post_id, parent_id, depth y author_id en las ediciones
-- Proposito: que editar un comentario no pueda moverlo de hilo ni de publicacion
-- Dependencias: 121 (hilos y profundidad), 127 (politica de UPDATE y sello de edicion)
-- Impacto: ninguno para la aplicacion; los dos UPDATE legitimos solo tocan body y deleted_at
-- Persistencia: permanente
--
-- POR QUE
--
-- La politica de UPDATE de la 127 dice:
--
--   WITH CHECK (auth.uid() = author_id)
--
-- y su comentario afirma que "impide que la edicion cambie el dueño o mueva el
-- comentario a otra publicacion". Lo primero si; lo segundo NO. `WITH CHECK`
-- solo comprueba como queda la fila respecto a esa condicion: garantiza que
-- siga siendo tuya y nada mas. `post_id`, `parent_id` y `depth` quedan libres.
--
-- Y el trigger que calcula la profundidad -`community_comment_set_depth`, de la
-- 121- es BEFORE **INSERT**. En un UPDATE no valida nada, asi que la comprobacion
-- de "el padre pertenece a otra publicacion" que hace al insertar no se repite
-- al editar.
--
-- Resultado: una persona autenticada, llamando directo a PostgREST -no desde
-- la aplicacion, que solo manda `body`-, podia mover su propio comentario a
-- otra publicacion, colgarlo de un padre de otro hilo o ponerle una
-- profundidad inventada, y dejar el arbol estructuralmente inconsistente.
--
-- No es una fuga de datos: sigue sin poder leer ni escribir lo de otros. Es
-- integridad del hilo.
--
-- Lo detecto la revision automatica del PR #1. El comentario del SQL prometia
-- una garantia que la politica no daba, que es peor que no comentar nada:
-- cualquiera que lo leyera daba el caso por cubierto.
--
-- QUE SE CONGELA Y POR QUE ESOS CUATRO
--
-- Se reviso antes que ningun camino legitimo los toque. Los dos unicos UPDATE
-- que existen son `updateComment` -manda solo `body`- y
-- `community_soft_delete_comment` -`body` y `deleted_at`-. Ninguno cambia la
-- posicion del comentario ni su autor.
--
-- `author_id` se incluye aunque la politica ya lo cubra: el trigger vale
-- tambien para `service_role`, que se salta RLS.
--
-- El nombre del trigger empieza por `freeze` y el del sello por `stamp`, y
-- Postgres dispara los BEFORE UPDATE en orden alfabetico: si la edicion viene
-- manipulada, se aborta antes de sellar `edited_at`.
--
-- REVERSION
--
--   DROP TRIGGER IF EXISTS trigger_community_comment_freeze_structure ON public.community_comments;
--   DROP FUNCTION IF EXISTS public.community_comment_freeze_structure();

CREATE OR REPLACE FUNCTION public.community_comment_freeze_structure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.post_id IS DISTINCT FROM OLD.post_id THEN
    RAISE EXCEPTION 'Un comentario no se puede mover a otra publicacion';
  END IF;

  IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    RAISE EXCEPTION 'Un comentario no se puede mover a otro hilo';
  END IF;

  IF NEW.depth IS DISTINCT FROM OLD.depth THEN
    RAISE EXCEPTION 'La profundidad de un comentario no se edita';
  END IF;

  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'Un comentario no cambia de autor';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.community_comment_freeze_structure() IS
  'Impide que una edicion mueva un comentario de publicacion o de hilo. Lo que la politica de UPDATE no puede hacer por si sola.';

DROP TRIGGER IF EXISTS trigger_community_comment_freeze_structure ON public.community_comments;
CREATE TRIGGER trigger_community_comment_freeze_structure
BEFORE UPDATE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.community_comment_freeze_structure();

-- El comentario de la politica decia mas de lo que la politica hace. Se
-- corrige en la base, donde lo lee quien la inspeccione, no solo en el archivo.
COMMENT ON POLICY "Authors update own community comments" ON public.community_comments IS
  'Solo el autor edita su comentario. El WITH CHECK garantiza unicamente que la fila siga siendo suya: que la edicion no mueva el comentario de publicacion, de hilo o de profundidad lo impone el trigger trigger_community_comment_freeze_structure.';
