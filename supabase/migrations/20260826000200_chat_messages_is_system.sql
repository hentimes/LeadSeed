-- 120 - Distinguir el mensaje de sistema del anuncio de staff
--
-- Los avisos de pausa y reanudacion de sala ("El chat quedo pausado hasta...",
-- "El chat volvio a estar disponible.") los inserta chatService reutilizando
-- `is_announcement = true`, que es la MISMA bandera que usan los anuncios
-- `@todos` que escribe una persona. Al ser indistinguibles, los dos se pintan
-- igual: un bloque ambar a ancho completo. En una sala que se pausa y se
-- reanuda un par de veces, la conversacion queda sepultada bajo cuatro
-- bloques de avisos automaticos.
--
-- ## Por que una columna nueva y no las alternativas
--
-- Detectar por el texto del mensaje era la opcion sin migracion, y se
-- descarto: acopla el render a una cadena literal, se rompe el dia que alguien
-- cambie la redaccion o traduzca la interfaz, y clasificaria como "de sistema"
-- un anuncio real que un admin escriba con ese mismo texto.
--
-- Reemplazar `is_announcement` por un enum `kind` era mas limpio en abstracto,
-- pero obliga a tocar todos los `.eq('is_announcement', ...)`, las RPC de
-- anuncios pendientes y el codigo que ya lee esa bandera. Es mucha superficie
-- para un requisito que es binario, no una taxonomia.
--
-- `is_system` es ortogonal a `is_announcement` a proposito: un mensaje de
-- sistema sigue teniendo `is_announcement = true` y por lo tanto sigue
-- avisando a quien no estaba conectado. Lo unico que cambia es como se dibuja.

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.chat_messages.is_system IS
  'Mensaje generado por el sistema (pausa/reanudacion de sala), no escrito por una persona. Se dibuja como una linea chiquita en cursiva en vez de un bloque destacado.';

-- Backfill de los historicos.
--
-- Es seguro porque estos dos textos los genera el codigo, nunca se tipean: su
-- forma es estable salvo la fecha interpolada del primero, y por eso el primer
-- filtro va con LIKE sobre el prefijo y el segundo con igualdad exacta.
--
-- ANTES DE APLICAR EN PRODUCCION: correr el SELECT de abajo. Si devuelve
-- muchas mas filas de las esperadas (dos por cada vez que se pauso una sala),
-- revisar a mano antes del UPDATE: significaria que alguien escribio un
-- anuncio con ese texto exacto y se estaria reclasificando de mas.
--
--   SELECT room_id, content, count(*)
--   FROM public.chat_messages
--   WHERE is_announcement = true
--     AND (content LIKE 'El chat quedó pausado hasta%'
--          OR content = 'El chat volvió a estar disponible.')
--   GROUP BY room_id, content;

UPDATE public.chat_messages
SET is_system = true
WHERE is_announcement = true
  AND is_system = false
  AND (
    content LIKE 'El chat quedó pausado hasta%'
    OR content = 'El chat volvió a estar disponible.'
  );

NOTIFY pgrst, 'reload schema';
