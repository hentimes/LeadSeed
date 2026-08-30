-- 134 - Notas y adjuntos de una tarea
--
-- Las dos piezas que faltaban para que el detalle de una tarea sirva de algo:
-- poder anotar lo que fue pasando, y poder colgarle una foto o un archivo.
--
-- ## Notas: tabla, no un campo de texto
--
-- `tasks.descripcion` ya existe y podria alcanzar. No alcanza, y la diferencia
-- es que una nota tiene FECHA: "el martes llame y no contesto" solo significa
-- algo con su cuando al lado. Metidas todas en un mismo campo se pisan, no se
-- pueden borrar de a una, y quedan en el orden en que alguien las tipeo.

create table if not exists public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  cuerpo text not null check (char_length(trim(cuerpo)) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.task_notes is
  'Anotaciones fechadas de una tarea. Se borran con ella.';

create index if not exists task_notes_task_idx
  on public.task_notes (task_id, created_at desc);

alter table public.task_notes enable row level security;

/*
 * Igual que en las subtareas: la pertenencia se pregunta a la tarea madre en
 * vez de duplicar `user_id`. Con el dueño guardado dos veces, las dos filas
 * pueden discrepar y la base no tendria como impedirlo.
 */
drop policy if exists task_notes_select_own on public.task_notes;
create policy task_notes_select_own on public.task_notes
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists task_notes_insert_own on public.task_notes;
create policy task_notes_insert_own on public.task_notes
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists task_notes_delete_own on public.task_notes;
create policy task_notes_delete_own on public.task_notes
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Adjuntos
-- ---------------------------------------------------------------------------

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null,
  nombre text not null,
  mime text not null,
  bytes integer not null,
  created_at timestamptz not null default now()
);

comment on table public.task_attachments is
  'Archivos colgados de una tarea. La fila vive aca; el archivo, en el bucket task-files.';

create index if not exists task_attachments_task_idx
  on public.task_attachments (task_id, created_at desc);

alter table public.task_attachments enable row level security;

drop policy if exists task_attachments_select_own on public.task_attachments;
create policy task_attachments_select_own on public.task_attachments
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists task_attachments_insert_own on public.task_attachments;
create policy task_attachments_insert_own on public.task_attachments
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists task_attachments_delete_own on public.task_attachments;
create policy task_attachments_delete_own on public.task_attachments
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- El bucket
-- ---------------------------------------------------------------------------
--
-- Bucket propio y no el del foro ni el del chat, por los mismos tres motivos
-- que documenta la 125: el limite de tamaño, los tipos admitidos y el ciclo de
-- vida son distintos. El del chat se purga a los 30 dias; un archivo colgado de
-- una tarea tiene que vivir mientras viva la tarea.
--
-- **PRIVADO**, al reves que el del foro. El foro se lee entero con estar
-- autenticado, asi que una URL publica no agregaba restriccion. Una tarea es de
-- una sola persona: con el bucket publico, cualquiera con el enlace veria el
-- archivo aunque no pueda ver la tarea. Se lee con URL firmada.
--
-- Admite mas que imagenes -PDF, hojas de calculo- porque el pedido era "fotos o
-- archivos". 5 MB de tope: las imagenes ya llegan comprimidas del cliente, y el
-- margen es para los documentos.
--
-- OJO CON LA CUOTA: el plan gratuito de Supabase da 1 GB de Storage entre TODOS
-- los buckets. Este es el tercero. Conviene mirar Settings -> Usage antes de
-- abrirlo a todo el mundo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-files',
  'task-files',
  false,
  5242880, -- 5 MB
  array[
    'image/avif', 'image/webp', 'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

/*
 * La ruta es `{uid}/{uuid}.{ext}`, no `{taskId}/...`.
 *
 * Mismo motivo temporal que en la 125: al elegir el archivo la tarea puede no
 * estar guardada todavia, asi que no hay `taskId` contra el que validar en el
 * INSERT. El vinculo lo hace despues la fila de `task_attachments`.
 */
drop policy if exists "task_files_owner_read" on storage.objects;
create policy "task_files_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'task-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "task_files_owner_insert" on storage.objects;
create policy "task_files_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'task-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "task_files_owner_delete" on storage.objects;
create policy "task_files_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'task-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
