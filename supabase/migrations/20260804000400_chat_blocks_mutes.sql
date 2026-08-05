-- Query permanente
-- Dominio: chat
-- Objetivo: bloqueo y silencio entre usuarios.
--
-- Bloqueo (chat_user_blocks): si A bloquea a B, B no le puede mandar DM a A
-- (se corta en el INSERT via trigger) y ademas B desaparece de la sala
-- general para A (eso se filtra en el cliente, no aca: la fila de bloqueo es
-- publica -entre autenticados- para que el cliente pueda armar su lista de
-- "a quien tengo que esconder").
--
-- Silencio (chat_user_mutes): solo oculta en el cliente, no impide que el
-- silenciado siga viendo y enviando con normalidad. Se maneja igual que el
-- bloqueo del lado de "que mensajes esconder", pero no bloquea nada en el
-- servidor.

CREATE TABLE IF NOT EXISTS public.chat_user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.chat_user_mutes (
  muter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

ALTER TABLE public.chat_user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_user_mutes ENABLE ROW LEVEL SECURITY;

-- Cada quien necesita ver sus propios bloqueos/silencios para filtrar su
-- vista del chat. No hace falta que un usuario vea a quien bloqueo otro.
DROP POLICY IF EXISTS "Users read their own blocks" ON public.chat_user_blocks;
CREATE POLICY "Users read their own blocks"
ON public.chat_user_blocks
FOR SELECT
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users create their own blocks" ON public.chat_user_blocks;
CREATE POLICY "Users create their own blocks"
ON public.chat_user_blocks
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users remove their own blocks" ON public.chat_user_blocks;
CREATE POLICY "Users remove their own blocks"
ON public.chat_user_blocks
FOR DELETE
USING (auth.uid() = blocker_id);

-- Excepcion: para poder rechazar el INSERT de un DM del lado del emisor
-- bloqueado, el trigger de chat_direct_messages necesita leer bloqueos
-- ajenos. Corre como SECURITY DEFINER (mas abajo), asi que no necesita una
-- policy de SELECT adicional para eso.

DROP POLICY IF EXISTS "Users read their own mutes" ON public.chat_user_mutes;
CREATE POLICY "Users read their own mutes"
ON public.chat_user_mutes
FOR SELECT
USING (auth.uid() = muter_id);

DROP POLICY IF EXISTS "Users create their own mutes" ON public.chat_user_mutes;
CREATE POLICY "Users create their own mutes"
ON public.chat_user_mutes
FOR INSERT
WITH CHECK (auth.uid() = muter_id);

DROP POLICY IF EXISTS "Users remove their own mutes" ON public.chat_user_mutes;
CREATE POLICY "Users remove their own mutes"
ON public.chat_user_mutes
FOR DELETE
USING (auth.uid() = muter_id);

-- Corta el envio de DM cuando el receptor bloqueo al emisor. Sin esto, el
-- bloqueo solo ocultaria el mensaje en el cliente del bloqueador -- el
-- bloqueado seguiria pudiendo escribir y el mensaje quedaria en la base.
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
    RAISE EXCEPTION 'No podés enviarle mensajes a este usuario'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_chat_direct_message_block ON public.chat_direct_messages;
CREATE TRIGGER trigger_enforce_chat_direct_message_block
BEFORE INSERT ON public.chat_direct_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_direct_message_block();

NOTIFY pgrst, 'reload schema';
