-- Query permanente
-- Dominio: chat
-- Objetivo: @limpiar y @purgar fallaban siempre que la sala tenia algun
--           mensaje con adjunto: al borrar el mensaje, la fila cae en
--           cascada hasta chat_message_attachments, cuyo trigger
--           delete_chat_attachment_object() borraba el objeto de
--           storage.objects con un DELETE directo. Supabase Storage agrego
--           un trigger de proteccion (storage.protect_delete()) que rechaza
--           cualquier DELETE directo sobre esa tabla salvo que la sesion
--           habilite explicitamente storage.allow_delete_query -- eso
--           abortaba todo el borrado masivo con un solo adjunto que tocar.

CREATE OR REPLACE FUNCTION public.delete_chat_attachment_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  DELETE FROM storage.objects
  WHERE bucket_id = 'chat-attachments'
    AND name = OLD.storage_path;

  RETURN OLD;
END;
$$;

NOTIFY pgrst, 'reload schema';
