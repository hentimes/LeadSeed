-- Query permanente
-- Dominio: chat
-- Objetivo: @limpiar y @purgar fallaban con violacion de foreign key cada vez
--           que la sala tenia algun mensaje respondido (reply_to_id), porque
--           esa FK autorreferenciada no tenia accion de borrado (NO ACTION).
--           Al borrar el mensaje original, Postgres rechazaba todo el DELETE
--           en bloque porque otro mensaje seguia apuntando a el.
--           La solucion es ON DELETE SET NULL: al borrar el mensaje citado,
--           la respuesta simplemente pierde la referencia (reply_to_id queda
--           null) en vez de bloquear el borrado.

ALTER TABLE public.chat_messages
DROP CONSTRAINT chat_messages_reply_to_id_fkey;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_reply_to_id_fkey
FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
