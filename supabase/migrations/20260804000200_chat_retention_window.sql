-- Query permanente
-- Dominio: chat
-- Objetivo: extender la retencion general del chat y hacer permanente la
--           conservacion de mensajes fijados (no solo mientras el pin esta
--           vigente).
--
-- El borrado de chat_messages nunca estuvo atado a que alguien salga de la
-- seccion de chat o cierre la extension: es un trigger que corre en cada
-- INSERT y borra por antiguedad (created_at), sin mirar sesiones ni
-- conexiones. Lo que se ajusta aca es la ventana: de 48 horas a 30 dias, para
-- que el historial normal dure mucho mas sin llegar a ser un log infinito.
--
-- Ademas, hasta ahora un mensaje fijado dejaba de estar protegido en cuanto
-- vencia el pin (pinned_until <= now()), asi que un mensaje importante fijado
-- por 24h se borraba igual a los 30 dias si nadie lo habia guardado aparte.
-- Se cambia el criterio: que un mensaje haya sido fijado alguna vez (exista
-- la fila en chat_pinned_messages, este o no vigente) lo protege para
-- siempre. El banner de "fijado" en la UI ya filtra por pinned_until > now(),
-- asi que esto no afecta que deje de mostrarse arriba cuando corresponde -
-- solo evita que el contenido se pierda.

CREATE OR REPLACE FUNCTION public.clean_old_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_messages m
  WHERE m.room_id = NEW.room_id
    AND m.created_at < now() - interval '30 days'
    AND NOT m.is_announcement
    AND NOT EXISTS (SELECT 1 FROM public.chat_saved_messages s WHERE s.message_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM public.chat_pinned_messages p WHERE p.message_id = m.id);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
