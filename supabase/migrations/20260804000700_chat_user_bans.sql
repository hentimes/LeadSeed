-- Query permanente
-- Dominio: chat
-- Objetivo: admin/helper banean usuarios del chat por tiempo definido o
--           indefinido. El baneo bloquea leer y escribir: se hace cumplir en
--           el servidor (trigger que rechaza el INSERT) y en el cliente se
--           reemplaza toda la sala por una pantalla explicando el motivo y
--           cuando se levanta.

CREATE TABLE IF NOT EXISTS public.chat_user_bans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  -- null = indefinido.
  banned_until timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  lifted_at timestamptz,
  lifted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS chat_user_bans_user_active_idx
ON public.chat_user_bans (user_id, banned_until)
WHERE lifted_at IS NULL;

ALTER TABLE public.chat_user_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own bans" ON public.chat_user_bans;
CREATE POLICY "Users read their own bans"
ON public.chat_user_bans
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Staff create bans" ON public.chat_user_bans;
CREATE POLICY "Staff create bans"
ON public.chat_user_bans
FOR INSERT
WITH CHECK (
  auth.uid() = banned_by
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Staff lift bans" ON public.chat_user_bans;
CREATE POLICY "Staff lift bans"
ON public.chat_user_bans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

-- Corta el envio de mensajes de sala mientras el baneo este activo. El baneo
-- de LECTURA se resuelve en el cliente (chat_user_bans es legible por el
-- propio baneado, asi que puede saber por que no ve nada).
CREATE OR REPLACE FUNCTION public.enforce_chat_message_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chat_user_bans b
    WHERE b.user_id = NEW.user_id
      AND b.lifted_at IS NULL
      AND (b.banned_until IS NULL OR b.banned_until > now())
  ) THEN
    RAISE EXCEPTION 'Estás baneado del chat' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_chat_message_ban ON public.chat_messages;
CREATE TRIGGER trigger_enforce_chat_message_ban
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_message_ban();

-- Igual para mensajes directos: un baneado tampoco deberia poder abrir un
-- canal alternativo por DM para seguir escribiendo.
CREATE OR REPLACE FUNCTION public.enforce_chat_direct_message_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chat_user_bans b
    WHERE b.user_id = NEW.sender_id
      AND b.lifted_at IS NULL
      AND (b.banned_until IS NULL OR b.banned_until > now())
  ) THEN
    RAISE EXCEPTION 'Estás baneado del chat' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_chat_direct_message_ban ON public.chat_direct_messages;
CREATE TRIGGER trigger_enforce_chat_direct_message_ban
BEFORE INSERT ON public.chat_direct_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_direct_message_ban();

-- Chequeo rapido para el cliente: si el propio usuario esta baneado ahora.
CREATE OR REPLACE FUNCTION public.fetch_my_active_chat_ban()
RETURNS public.chat_user_bans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.*
  FROM public.chat_user_bans b
  WHERE b.user_id = auth.uid()
    AND b.lifted_at IS NULL
    AND (b.banned_until IS NULL OR b.banned_until > now())
  ORDER BY b.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fetch_my_active_chat_ban() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fetch_my_active_chat_ban() TO authenticated;

NOTIFY pgrst, 'reload schema';
