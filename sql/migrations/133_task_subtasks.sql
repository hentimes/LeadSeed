-- 133 - Subtareas
--
-- Una tarea con tres pasos adentro se lee llena; tres lineas de texto suelto en
-- una descripcion se leen como un textarea a medio escribir. Esa es la razon de
-- que esto sea una tabla y no markdown dentro de `tasks.descripcion`:
--
--  - Guardado como texto no hay estado por item, asi que no se puede marcar una
--    y dejar las otras.
--  - No hay contador, y el contador es lo que hace que la tarjeta del tablero
--    -que mide 38px- deje de verse vacia: "2 de 5" dice mas que cualquier
--    adorno.
--  - No se pueden reordenar sin reescribir y volver a parsear el texto entero.
--
-- El atajo de guardarlas como texto ahorra esta migracion y despues cobra una
-- peor: la de migrar datos ya escritos a mano por los usuarios.
--
-- ## Borrado en cascada
--
-- `on delete cascade` y no `set null`: una subtarea sin tarea madre no es nada.
-- Es lo contrario que `tasks.section_id`, donde el nulo si significa algo
-- ("sin seccion"), y por eso ahi se eligio `set null`.

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 120),
  hecha boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.task_subtasks is
  'Los pasos de una tarea. Se borran con ella: una subtarea sin madre no significa nada.';

create index if not exists task_subtasks_task_idx
  on public.task_subtasks (task_id, position);

alter table public.task_subtasks enable row level security;

/*
 * Las politicas se apoyan en la tarea madre en vez de llevar su propio
 * `user_id`.
 *
 * Duplicar el dueño abre la puerta a que las dos filas discrepen -una subtarea
 * de un usuario colgando de la tarea de otro-, y no habria forma de que la base
 * lo impidiera. Preguntando por la madre, la pertenencia tiene una sola fuente.
 */
drop policy if exists task_subtasks_select_own on public.task_subtasks;
create policy task_subtasks_select_own on public.task_subtasks
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists task_subtasks_insert_own on public.task_subtasks;
create policy task_subtasks_insert_own on public.task_subtasks
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists task_subtasks_update_own on public.task_subtasks;
create policy task_subtasks_update_own on public.task_subtasks
  for update using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists task_subtasks_delete_own on public.task_subtasks;
create policy task_subtasks_delete_own on public.task_subtasks
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

notify pgrst, 'reload schema';
