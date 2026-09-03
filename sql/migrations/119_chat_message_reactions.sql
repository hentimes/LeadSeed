-- 119 - Reacciones a los mensajes del chat
--
-- Tres emojis fijos (pulgar arriba, pulgar abajo, corazon) y no un selector
-- libre. Dos motivos: menos superficie de moderacion -un picker completo deja
-- entrar cualquier cosa a un chat de trabajo- y una fila de acciones que sigue
-- entrando en un panel de 320px.
--
-- El limite se aplica aca con un CHECK y no solo en el frontend, por el mismo
-- criterio que uso 117 con la descripcion de listas: cualquier otro camino
-- (un script, la API directa) no debe poder colar un emoji fuera de la lista.
--
-- Una fila por (mensaje, usuario, emoji). O sea: la misma persona puede marcar
-- 👍 y ❤️ a la vez en el mismo mensaje, pero no repetir el mismo emoji. La
-- clave primaria compuesta hace las dos cosas sin un indice unico aparte, igual
-- que community_post_likes.
--
-- No se guarda un contador desnormalizado en chat_messages (a diferencia de
-- community_posts.likes_count). El volumen de un chat interno no lo justifica y
-- la vista agregada del final resuelve el conteo sin duplicar estado que haya
-- que mantener sincronizado con un trigger.

CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍', '👎', '❤️')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- "Todas las reacciones de estos mensajes" es la consulta que se repite en
-- cada carga de sala. La clave primaria empieza por message_id, asi que ya
-- serviria; el indice explicito existe porque la vista agrupa por message_id
-- y conviene que el planner lo tenga a mano.
CREATE INDEX IF NOT EXISTS chat_message_reactions_message_idx
ON public.chat_message_reactions (message_id);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados leen reacciones" ON public.chat_message_reactions;
CREATE POLICY "Usuarios autenticados leen reacciones"
ON public.chat_message_reactions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Solo se puede reaccionar en nombre propio: sin este WITH CHECK, cualquiera
-- podria insertar una fila con el user_id de otra persona.
DROP POLICY IF EXISTS "Usuarios insertan su propia reaccion" ON public.chat_message_reactions;
CREATE POLICY "Usuarios insertan su propia reaccion"
ON public.chat_message_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios borran su propia reaccion" ON public.chat_message_reactions;
CREATE POLICY "Usuarios borran su propia reaccion"
ON public.chat_message_reactions
FOR DELETE
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.chat_message_reactions TO authenticated;

-- Vista agregada: una fila por (mensaje, emoji) con el conteo y quienes
-- reaccionaron. `user_ids` viaja para que el cliente sepa si reaccionaste vos
-- sin una segunda consulta; son uuids que ese cliente ya puede leer por la
-- politica de SELECT de arriba, asi que no expone nada nuevo.
CREATE OR REPLACE VIEW public.chat_message_reaction_summary AS
SELECT
  message_id,
  emoji,
  count(*)::int AS count,
  array_agg(user_id) AS user_ids
FROM public.chat_message_reactions
GROUP BY message_id, emoji;

GRANT SELECT ON public.chat_message_reaction_summary TO authenticated;

-- Alta en la publicacion de realtime, para que una reaccion aparezca en la
-- pantalla del resto sin recargar la sala.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_message_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
