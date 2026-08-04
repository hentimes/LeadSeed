-- Query permanente
-- Dominio: chat
-- Objetivo: ampliar el limite de contenido de los mensajes para soportar menciones embebidas
--
-- Las menciones se guardan dentro del propio texto del mensaje con el formato
-- @[etiqueta](user:UUID) o @[etiqueta](post:UUID), y el cliente las parsea al
-- renderizar (src/utils/mentionParser.ts).
--
-- El usuario escribe como maximo 140 caracteres visibles, pero cada mencion se
-- expande al guardarse: "@Ana" pasa a "@[Ana](user:<uuid de 36>)". El limite
-- almacenado contempla ese crecimiento; el visible se valida en el cliente
-- (MAX_CHAT_MESSAGE_DISPLAY_LENGTH en src/services/chatService.ts).

ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_content_check;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_content_check CHECK (char_length(content) <= 1000);

NOTIFY pgrst, 'reload schema';
