-- mensaje_de_bloqueo_en_espanol_neutro
--
-- Tipo:           correccion de texto en una funcion
-- Objeto:         public.enforce_chat_direct_message_block()
-- Clase:          mejora
-- Persistencia:   permanente
-- Reversibilidad: total
--
-- POR QUE
--
-- La aplicacion pasa a hablar en español neutro latinoamericano, sin formas
-- voseantes. Esta es la unica frase con voseo que sale de la base hacia la
-- pantalla: el resto de los `RAISE EXCEPTION` ya estan en neutro o son
-- mensajes internos en ingles.
--
--   'No podés enviarle mensajes a este usuario'  ->  'No puedes ...'
--
-- CUIDADO: EL CLIENTE COMPARABA ESTA FRASE
--
-- `DirectMessageWindow.tsx` decidia si mostrar el aviso de bloqueo asi:
--
--   detalle.includes('podés enviarle') ? detalle : 'No se pudo enviar...'
--
-- O sea que cambiar el texto aqui, y solo aqui, habria dejado de mostrar el
-- aviso -exactamente el fallo que la nota de ese fichero cuenta que ya se
-- corrigio una vez-. En el mismo commit, el cliente pasa a mirar el CODIGO de
-- error en vez de la frase.
--
-- Por eso el ERRCODE se conserva tal cual: ahora es el contrato entre la base
-- y la interfaz, y ya no se puede tocar sin romperla. Un texto se traduce; un
-- codigo, no.

CREATE OR REPLACE FUNCTION public.enforce_chat_direct_message_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chat_user_blocks b
    WHERE b.blocker_id = NEW.receiver_id AND b.blocked_id = NEW.sender_id
  ) THEN
    -- El 42501 (insufficient_privilege) es lo que mira la interfaz para saber
    -- que esto es un bloqueo entre personas y no un fallo cualquiera. No
    -- cambiarlo sin cambiar `DirectMessageWindow.tsx`.
    RAISE EXCEPTION 'No puedes enviarle mensajes a este usuario'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_chat_direct_message_block() IS
  'Corta el mensaje directo si el receptor bloqueo al emisor. Lanza 42501, que es el codigo por el que la interfaz reconoce el bloqueo: el texto se puede reescribir, el codigo no.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Volver al texto de la 079. Habria que devolver tambien la comparacion por
--   frase en DirectMessageWindow.tsx, que es justamente lo que se quiso quitar.
