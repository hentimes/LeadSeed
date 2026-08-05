-- Query permanente
-- Dominio: chat
-- Objetivo: permitir que admin/helper borren un mensaje al resolver un
--           reporte. chat_messages nunca tuvo policy de DELETE (solo el
--           trigger de limpieza automatica borraba, corriendo como
--           SECURITY DEFINER por encima de RLS); sin esta policy, el intento
--           de borrado desde el cliente lo rechaza RLS en silencio.

DROP POLICY IF EXISTS "Staff delete chat messages" ON public.chat_messages;
CREATE POLICY "Staff delete chat messages"
ON public.chat_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

NOTIFY pgrst, 'reload schema';
