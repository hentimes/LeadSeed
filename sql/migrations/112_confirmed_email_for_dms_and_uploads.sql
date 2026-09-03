-- 112 - Completar el blindaje de la 110: mensajes directos, subidas y reportes
--
-- La 110 declaraba cubrir "todo lo que otros usuarios llegan a ver" y se dejo
-- tres puertas abiertas. Las cierra esta.
--
-- 1. chat_direct_messages. Un DM lo lee una persona real, asi que entra de lleno
--    en el criterio de la 110. Sin esto, una cuenta con correo falso o ajeno
--    puede spamear o acosar por privado sin confirmar nada. Es el hueco mas
--    grave de los tres.
--
-- 2. storage.objects del bucket chat-attachments. La 110 cerro la fila en
--    chat_message_attachments, pero no la subida del archivo. Como
--    chat_attachments_public_read deja leer cualquier objeto del bucket sin
--    exigir que exista la fila que lo vincula a un mensaje, una cuenta sin
--    confirmar podia subir archivos y repartir la URL: hosting gratis a costa
--    del proyecto, sin pasar por el chat.
--
-- 3. chat_message_reports. Solo lo ve el staff, asi que no es contenido publico
--    y omitirlo era defendible. Se incluye igual porque cuesta una linea y
--    frena el reporte-spam desde cuentas desechables.
--
-- Riesgo de regresion: ninguno. Es una condicion AND adicional sobre INSERT que
-- solo afecta a usuarios con email_confirmed_at nulo, y en produccion no hay
-- ninguno (verificado antes de aplicar la 110).

-- ---------------------------------------------------------------------------
-- Mensajes directos
-- ---------------------------------------------------------------------------
drop policy if exists "Users send direct messages as themselves" on public.chat_direct_messages;
create policy "Users send direct messages as themselves"
on public.chat_direct_messages
for insert
with check (
  auth.uid() = sender_id
  and public.is_current_user_confirmed()
);

-- ---------------------------------------------------------------------------
-- Subida de adjuntos al bucket
-- ---------------------------------------------------------------------------
-- El `to authenticated` del original se conserva: quitarlo abriria la politica a
-- otros roles y seria una regresion, no una mejora.
drop policy if exists "chat_attachments_owner_insert" on storage.objects;
create policy "chat_attachments_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_current_user_confirmed()
);

-- ---------------------------------------------------------------------------
-- Reportes de moderacion
-- ---------------------------------------------------------------------------
drop policy if exists "Users create their own reports" on public.chat_message_reports;
create policy "Users create their own reports"
on public.chat_message_reports
for insert
with check (
  auth.uid() = reporter_id
  and public.is_current_user_confirmed()
);

notify pgrst, 'reload schema';
