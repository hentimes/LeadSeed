-- Query permanente
-- Dominio: chat
-- Objetivo: que admin/helper puedan borrar UN mensaje puntual desde el menu
--           de acciones del mensaje (junto a guardar/destacar/reportar).
--           A diferencia de @limpiar/@purgar (que borran filas de verdad),
--           esto es un borrado "blando": el mensaje se queda en la sala pero
--           su contenido se reemplaza por un aviso, para que la conversacion
--           alrededor (respuestas a ese mensaje, orden del historial) no
--           quede rota. Los adjuntos si se borran de verdad (incluido el
--           archivo en storage, via el trigger que ya limpia eso).

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.delete_chat_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  ) THEN
    RAISE EXCEPTION 'Solo un administrador o helper puede eliminar un mensaje' USING ERRCODE = '42501';
  END IF;

  UPDATE public.chat_messages
  SET content = 'Mensaje eliminado por el administrador',
      deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = p_message_id
    AND deleted_at IS NULL;

  DELETE FROM public.chat_message_attachments WHERE message_id = p_message_id;
  DELETE FROM public.chat_pinned_messages WHERE message_id = p_message_id;
  DELETE FROM public.chat_highlighted_messages WHERE message_id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_chat_message(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_chat_message(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
