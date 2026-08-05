-- Query permanente
-- Dominio: chat
-- Objetivo: comandos de staff @silencio (pausar la sala por un tiempo),
--           @limpiar (borrar todo salvo fijados/destacados/guardados) y
--           @purgar (borrar todo sin excepcion).

-- --- @silencio ---------------------------------------------------------

-- La policy de UPDATE para admin/helper ya existe desde la migracion 019 y
-- cubre cualquier columna, estas incluidas -- no hace falta RLS nueva.
ALTER TABLE public.chat_rooms
ADD COLUMN IF NOT EXISTS frozen_until timestamptz,
ADD COLUMN IF NOT EXISTS frozen_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Corta el envio de cualquiera que no sea staff mientras la sala este
-- pausada. El propio staff puede seguir escribiendo (por ejemplo, para
-- avisar por que se pauso o para reanudarla).
CREATE OR REPLACE FUNCTION public.enforce_chat_room_freeze()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chat_rooms r
    WHERE r.id = NEW.room_id
      AND r.frozen_until IS NOT NULL
      AND r.frozen_until > now()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.user_id
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  ) THEN
    RAISE EXCEPTION 'El chat está pausado' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_chat_room_freeze ON public.chat_messages;
CREATE TRIGGER trigger_enforce_chat_room_freeze
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_room_freeze();

-- --- @limpiar / @purgar --------------------------------------------------

-- Borra todo lo que no tenga proteccion (fijado, destacado o guardado por
-- alguien). El chequeo de rol es defensa en profundidad: la policy de DELETE
-- de la migracion 081 ya limita esto a staff, pero una funcion SECURITY
-- DEFINER necesita su propio control porque corre por fuera de esa policy.
CREATE OR REPLACE FUNCTION public.clean_chat_room_messages(p_room_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  ) THEN
    RAISE EXCEPTION 'Solo un administrador o helper puede limpiar el chat' USING ERRCODE = '42501';
  END IF;

  WITH deleted AS (
    DELETE FROM public.chat_messages m
    WHERE m.room_id = p_room_id
      AND NOT EXISTS (SELECT 1 FROM public.chat_saved_messages s WHERE s.message_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM public.chat_pinned_messages pin WHERE pin.message_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM public.chat_highlighted_messages h WHERE h.message_id = m.id)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.clean_chat_room_messages(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.clean_chat_room_messages(uuid) TO authenticated;

-- Sin ninguna excepcion: borra todo, incluido lo fijado/destacado/guardado
-- (las filas de esas tablas caen solas por ON DELETE CASCADE).
CREATE OR REPLACE FUNCTION public.purge_chat_room_messages(p_room_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  ) THEN
    RAISE EXCEPTION 'Solo un administrador o helper puede purgar el chat' USING ERRCODE = '42501';
  END IF;

  WITH deleted AS (
    DELETE FROM public.chat_messages WHERE room_id = p_room_id
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_chat_room_messages(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.purge_chat_room_messages(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
