-- 132 - Secciones del tablero de tareas, y color por tarea
--
-- El tablero tipo Asana necesita columnas propias. No sirve derivarlas de algo
-- que ya exista:
--
--  - `status` solo tiene dos valores, pendiente y completada.
--  - Los cuadrantes de Eisenhower ya son otra vista, y ademas se calculan; una
--    columna calculada no se puede reordenar ni renombrar.
--
-- Asi que las secciones son datos del usuario, como sus listas de leads.
--
-- ## Que pasa con las tareas sin seccion
--
-- `section_id` es nulo por defecto y queda nulo al borrar la seccion
-- (`on delete set null`). Una tarea nunca se pierde por borrar una columna: cae
-- a "Sin seccion", que el tablero pinta como una columna mas.
--
-- Es la diferencia con `on delete cascade`, que habria borrado las tareas junto
-- con la columna. Borrar una columna es una decision de organizacion; borrar el
-- trabajo que tenia adentro, no.
--
-- ## El orden
--
-- `position` es un entero, no un timestamp: las columnas se reordenan a mano y
-- el orden no tiene nada que ver con cuando se crearon. Se deja hueco entre
-- valores al insertar para poder mover sin renumerar todo.

create table if not exists public.task_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.task_sections is
  'Columnas del tablero de tareas. Las crea el usuario; una tarea sin seccion cae en "Sin seccion".';

create index if not exists task_sections_user_idx
  on public.task_sections (user_id, position);

alter table public.task_sections enable row level security;

drop policy if exists task_sections_select_own on public.task_sections;
create policy task_sections_select_own on public.task_sections
  for select using (auth.uid() = user_id);

drop policy if exists task_sections_insert_own on public.task_sections;
create policy task_sections_insert_own on public.task_sections
  for insert with check (auth.uid() = user_id);

drop policy if exists task_sections_update_own on public.task_sections;
create policy task_sections_update_own on public.task_sections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists task_sections_delete_own on public.task_sections;
create policy task_sections_delete_own on public.task_sections
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- La tarea: en que columna esta y de que color es
-- ---------------------------------------------------------------------------

alter table public.tasks
add column if not exists section_id uuid references public.task_sections(id) on delete set null;

comment on column public.tasks.section_id is
  'Columna del tablero. Nulo = "Sin seccion", que es donde caen las tareas al borrar su columna.';

create index if not exists tasks_section_idx
  on public.tasks (section_id)
  where section_id is not null;

/*
 * El color es del usuario, para distinguir tareas de un vistazo dentro de una
 * columna. Se guarda el hexadecimal y no un nombre de token: es un dato que
 * elige la persona, no un rol del sistema de diseno. Misma decision que el
 * color de las listas de leads.
 *
 * Nulo significa "sin color", que es lo normal: la mayoria de las tareas no
 * necesita uno y pintarlas todas anularia la senal.
 */
alter table public.tasks
add column if not exists color text
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

comment on column public.tasks.color is
  'Color elegido por el usuario, en hexadecimal. Nulo = sin color.';

notify pgrst, 'reload schema';
