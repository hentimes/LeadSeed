-- 060 - Cerrar el bucket de avatares
--
-- Hallazgo de la auditoria de RLS: sobre storage.objects convivian dos juegos
-- de politicas para el bucket 'avatars'. Uno acotado al dueño y otro abierto:
--
--   "Usuarios pueden subir avatares"      with_check: auth.role() = 'authenticated'
--   "Usuarios pueden actualizar avatares" using:      auth.role() = 'authenticated'
--
-- Las politicas permisivas se combinan con OR, asi que el juego abierto
-- anulaba al acotado: cualquier usuario logueado podia subir dentro de la
-- carpeta de otro y sobrescribir su avatar.
--
-- Se deja un unico juego, acotado por la carpeta raiz del objeto: tiene que
-- ser el uid del usuario. La app ya sube como "{user.id}/archivo".
--
-- Se prefiere el prefijo de ruta sobre owner porque owner lo completa la capa
-- de API de Storage y no toda escritura pasa por ahi; el nombre del objeto
-- siempre esta presente en el momento de evaluar la politica.
--
-- Migrar no rompe nada: al aplicarse, el bucket tenia 0 objetos.

-- ---------------------------------------------------------------------------
-- Limpiar el estado duplicado
-- ---------------------------------------------------------------------------
drop policy if exists "Usuarios pueden subir avatares" on storage.objects;
drop policy if exists "Usuarios pueden actualizar avatares" on storage.objects;
drop policy if exists "Users can upload their own avatars." on storage.objects;
drop policy if exists "Users can update their own avatars." on storage.objects;
drop policy if exists "Users can delete their own avatars." on storage.objects;
drop policy if exists "Avatares publicos" on storage.objects;
drop policy if exists "Avatar images are publicly accessible." on storage.objects;

-- ---------------------------------------------------------------------------
-- Juego unico
-- ---------------------------------------------------------------------------
-- El bucket es publico a proposito: los avatares se muestran por URL directa.
create policy "avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
