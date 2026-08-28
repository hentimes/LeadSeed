-- 127 - Una reaccion por persona, y edicion de comentarios
--
-- Dos cosas que faltaban y que el cliente solo no puede garantizar.

-- ---------------------------------------------------------------------------
-- 1. Una sola reaccion por persona y por mensaje
-- ---------------------------------------------------------------------------
--
-- La tabla de la 119 admite varias: su clave primaria es
-- (message_id, user_id, emoji), asi que la misma persona puede poner el pulgar
-- Y el corazon. El producto quiere que elegir una reemplace a la anterior.
--
-- La interfaz ya lo hace, pero no alcanza: dos pestañas abiertas de la misma
-- cuenta, o cualquier cliente que hable con PostgREST directamente, pueden
-- dejar dos puestas. Esto lo cierra donde no se puede esquivar.
--
-- Se borra la anterior en vez de rechazar la nueva a proposito: rechazar
-- obligaria al cliente a hacer dos llamadas y a ordenarlas bien, y si la
-- primera falla la persona se queda sin ninguna.

CREATE OR REPLACE FUNCTION public.enforce_single_chat_reaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.chat_message_reactions
  WHERE message_id = NEW.message_id
    AND user_id = NEW.user_id
    AND emoji IS DISTINCT FROM NEW.emoji;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_single_chat_reaction ON public.chat_message_reactions;
CREATE TRIGGER trigger_enforce_single_chat_reaction
BEFORE INSERT ON public.chat_message_reactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_chat_reaction();

-- ---------------------------------------------------------------------------
-- 2. Editar el propio comentario
-- ---------------------------------------------------------------------------
--
-- La 074 dio a los comentarios politicas de SELECT, INSERT y DELETE, pero
-- **ninguna de UPDATE**. Sin ella, RLS niega por defecto: no habia forma de
-- corregir un comentario, ni siquiera el propio.
--
-- A diferencia de las publicaciones, aca el staff NO puede editar: reescribir
-- lo que dijo otra persona en su nombre es distinto de borrarlo. Para moderar
-- ya esta el borrado suave de la 121, que deja constancia.

ALTER TABLE public.community_comments
ADD COLUMN IF NOT EXISTS edited_at timestamptz;

COMMENT ON COLUMN public.community_comments.edited_at IS
  'Cuando se edito por ultima vez, o NULL si nunca. Lo pone un trigger, no el cliente.';

DROP POLICY IF EXISTS "Authors update own community comments" ON public.community_comments;
CREATE POLICY "Authors update own community comments"
ON public.community_comments
FOR UPDATE
USING (auth.uid() = author_id)
-- El WITH CHECK impide que la edicion cambie el dueño o mueva el comentario a
-- otra publicacion: sin el, un UPDATE legitimo podria reescribir author_id.
WITH CHECK (auth.uid() = author_id);

/*
 * La marca la pone el servidor. Si dependiera del cliente, bastaria con no
 * mandar el campo para editar sin dejar rastro despues de que alguien
 * respondio, que es justo lo que la marca viene a impedir.
 *
 * Solo cuenta como edicion un cambio del texto: `deleted_at` lo mueve el
 * borrado suave y no es una edicion.
 */
CREATE OR REPLACE FUNCTION public.stamp_community_comment_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN
    NEW.edited_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stamp_community_comment_edit ON public.community_comments;
CREATE TRIGGER trigger_stamp_community_comment_edit
BEFORE UPDATE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.stamp_community_comment_edit();

NOTIFY pgrst, 'reload schema';
