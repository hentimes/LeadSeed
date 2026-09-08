-- Query permanente
-- Dominio: playbooks / guiones de conversacion con seguimiento por lead
-- Objeto: public.playbooks, playbook_sections, playbook_items,
--         playbook_runs, playbook_run_items, playbook_run_notes
-- Clase: capacidad nueva (seis tablas, un trigger, dos funciones)
-- Descripcion: define guiones por fases y registra su ejecucion sobre un lead
-- Proposito: que una reunion se conduzca con un guion y quede constancia de que
--            se abordo, cuando, y con que anotaciones
-- Dependencias: 000 (leads), 011 (appointments), 006 (lead_notes)
-- Impacto: ninguno sobre lo existente; solo anade objetos nuevos
-- Persistencia: permanente
-- Reversibilidad: total (drop de las seis tablas, el trigger y las dos funciones)
--
-- ======================================================================
-- LA SEMANTICA
-- ======================================================================
--
-- Va antes que el DDL porque lo condiciona entero, y porque fijarla mal hoy
-- obliga a migrar datos ya escritos cuando lleguen las fases 2 a 4:
--
--   Playbook     El PROCESO. "Asesoria PlanesPro". No tiene canal ni lead.
--   Fase         Un MOMENTO del proceso. "Fase 1 - Primera reunion".
--   Item         Un PUNTO QUE ABORDAR: titulo, pregunta y soporte.
--   Run          Ese proceso APLICADO A UN LEAD. Dura semanas y abarca
--                varias citas. NO es una reunion.
--   Interaccion  Cada contacto que ocurre durante el run: una reunion, un
--                envio, un seguimiento. NO es una tabla todavia.
--
-- La linea que mas decisiones explica es la cuarta. Un `playbook_run` NO es
-- una reunion. Si lo fuera, la segunda reunion con el mismo lead abriria un
-- recorrido nuevo y el proceso quedaria partido en trozos que nada vuelve a
-- juntar. Aca la segunda reunion CONTINUA el mismo run.
--
-- ======================================================================
-- LO QUE NO SE MODELA, Y POR QUE
-- ======================================================================
--
-- **Sin `channel`.** Es la tentacion obvia por vivir junto a las plantillas
-- -que si son por canal- y es justo lo que volveria los playbooks hijos del
-- modulo Mensajes. Un guion de diagnostico no pertenece a WhatsApp.
--
-- **Sin ramificaciones ni respuestas estructuradas.** Marcar un item como
-- `hecho` significa "ya lo converse", NO "respondio que si". Para ramificar
-- ("si si a la 3 y no a la 4, la conclusion es esta") habria que guardar la
-- respuesta, que es otro modelo. Se anade despues sin romper nada de esto.
--
-- **Sin `playbook_sessions`.** La entidad de interaccion no se crea ahora
-- porque solo existe la Fase 1 y seria una tabla con una fila por recorrido.
-- Lo que si se crea es el dato del que podra DERIVARSE: ver `answered_at`.
--
-- ======================================================================
-- LA FRONTERA DEL SNAPSHOT
-- ======================================================================
--
-- Las tres primeras tablas son DEFINICION; las tres ultimas, EJECUCION. Nada
-- de la definicion puede cambiar lo que ya esta escrito en la ejecucion.
--
-- Por eso `playbook_run_items` COPIA el titulo, la pregunta, el soporte y
-- ademas el titulo y la posicion de la FASE. Si el mes que viene se reescribe
-- la pregunta 7 o se renombra "Fase 1 - Diagnostico", la reunion de septiembre
-- tiene que seguir diciendo lo que realmente se pregunto. Guardar solo la
-- referencia haria que editar la definicion reescribiera en silencio el
-- historico de todas las reuniones pasadas.
--
-- Es el mismo razonamiento por el que `message_flow_progress` (108) no se
-- deduce de `send_logs`.
--
-- ======================================================================
-- LA PERTENENCIA: DOS PRECEDENTES CONTRADICTORIOS EN ESTE REPO
-- ======================================================================
--
-- Comprobado: no existe `workspace_id`, `organization_id`, `org_id`,
-- `tenant_id` ni `team_id` en ninguna migracion. El modelo es
-- `user_id -> auth.users(id)`. Aca no es costumbre, es el modelo.
--
-- Para las tablas HIJAS hay dos patrones vivos, y ninguno sustituyo al otro:
--
--   * 108 (`message_flow_steps`): la hija lleva `user_id` propio, puesto por
--     un trigger que lo copia del padre.
--   * 133 y 134 (`task_subtasks`, `task_notes`): la hija no lleva dueno; la
--     politica pregunta a la madre con un `exists`.
--
-- Se elige el segundo, y NO por ser posterior -las politicas de la 108 siguen
-- vigentes sobre sus tablas, nadie las derogo-, sino por el argumento que la
-- 134 dejo escrito: duplicar el dueno abre la puerta a que las dos filas
-- discrepen, y la base no tendria como impedirlo. El motivo de la 108 -que una
-- clave foranea no impide colgar una fila del padre de otro- solo aplica si la
-- politica mira el `user_id` DE LA HIJA. Preguntando por la madre, la
-- pertenencia tiene una sola fuente y el trigger sobra.
--
-- El precio esta en `playbook_items`, que queda a dos saltos del dueno: un
-- join mas por comprobacion, sobre tablas de decenas de filas. Es el unico
-- sitio donde duplicar `user_id` habria sido defendible.
--
-- **La DEFINICION usa `for all`; la EJECUCION no.** En las tres primeras
-- tablas el predicado es identico para los cuatro verbos y una sola politica
-- evita cuatro copias que mantener sincronizadas. En las tres de ejecucion no
-- lo es, y agrupar los verbos fue un error de la primera version: `for all`
-- incluye INSERT y UPDATE, con lo que la RPC pasaba a ser un camino opcional y
-- el snapshot, editable. Cada verbo tiene ahi su politica y sus motivos, al
-- lado de las tablas.
--
-- ======================================================================
-- BORRAR UNA CUENTA
-- ======================================================================
--
-- `playbooks.user_id` es `on delete cascade` y `playbook_runs.playbook_id` es
-- `on delete restrict`. Borrar la fila de `auth.users` de alguien que llego a
-- ejecutar un playbook falla: el cascade intenta llevarse sus playbooks y el
-- restrict lo impide.
--
-- No es nuevo -pasa igual entre `templates` y `message_flow_steps` desde la
-- 108- pero aqui queda escrito en vez de descubrirse el dia de una baja. La
-- salida no es aflojar el restrict, que seria tirar el historico: es borrar
-- primero los recorridos de esa cuenta, o archivarla en vez de borrarla.
--
-- ======================================================================
-- REVERSION
-- ======================================================================
--
--   drop function if exists public.finish_my_playbook_run(uuid, text, text, boolean);
--   drop function if exists public.start_my_playbook_run(uuid, uuid, uuid);
--   drop table if exists public.playbook_run_notes;
--   drop table if exists public.playbook_run_items;
--   drop table if exists public.playbook_runs;
--   drop table if exists public.playbook_items;
--   drop table if exists public.playbook_sections;
--   drop table if exists public.playbooks;
--   drop function if exists public.playbook_run_item_stamp();
--   drop function if exists public.playbook_run_item_guard();


-- ==================================================================== 1/6
-- DEFINICION: el proceso
-- ======================================================================

create table if not exists public.playbooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  description text check (char_length(description) <= 500),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.playbooks is
  'Guion de conversacion por fases. Es un PROCESO reutilizable: no tiene canal, ni lead, ni cita.';

comment on column public.playbooks.is_active is
  'Archivar en lugar de borrar. Un playbook con recorridos no se puede borrar (on delete restrict en playbook_runs), y esta es la salida.';

create index if not exists playbooks_user_idx
  on public.playbooks (user_id, is_active, created_at desc);


-- ==================================================================== 2/6
-- DEFINICION: las fases
-- ======================================================================

create table if not exists public.playbook_sections (
  id          uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.playbooks(id) on delete cascade,
  position    integer not null check (position > 0),
  title       text not null check (char_length(trim(title)) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint playbook_sections_posicion_unica unique (playbook_id, position)
    deferrable initially deferred
);

comment on table public.playbook_sections is
  'Las fases de un playbook. Existen desde el primer dia aunque solo haya una: anadir las fases 2 a 4 sera insertar filas, no migrar estructura.';

comment on constraint playbook_sections_posicion_unica on public.playbook_sections is
  'Diferible a proposito, a diferencia de message_flow_steps (108). Reordenar con un unico NO diferible obliga a un baile de posiciones intermedias; diferido, reordenar es un update dentro de una transaccion.';

-- Sin indice adicional: la restriccion unica de arriba ya crea uno sobre
-- (playbook_id, position), que es exactamente por donde se listan las fases.
-- Ser diferible no lo cambia: el indice existe igual, solo se pospone su
-- comprobacion al commit.


-- ==================================================================== 3/6
-- DEFINICION: los items
-- ======================================================================

create table if not exists public.playbook_items (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.playbook_sections(id) on delete cascade,
  position   integer not null check (position > 0),
  title      text not null check (char_length(trim(title)) between 1 and 120),
  question   text not null check (char_length(trim(question)) between 1 and 500),
  support    text check (char_length(support) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playbook_items_posicion_unica unique (section_id, position)
    deferrable initially deferred
);

comment on table public.playbook_items is
  'Un punto que abordar: titulo, pregunta y soporte. Nada mas: sin respuestas estructuradas, sin ramificaciones, sin condiciones.';

comment on column public.playbook_items.support is
  'Admite nulo: un item como "Nueva perspectiva" puede no tener lista de apoyo.';

-- Igual que en las fases: la restriccion unica ya indexa (section_id, position).


-- ==================================================================== 4/6
-- EJECUCION: el recorrido
-- ======================================================================

create table if not exists public.playbook_runs (
  id                    uuid primary key default gen_random_uuid(),
  playbook_id           uuid not null references public.playbooks(id) on delete restrict,
  user_id               uuid not null references auth.users(id) on delete cascade,
  lead_id               uuid not null references public.leads(id) on delete cascade,
  origin_appointment_id uuid references public.appointments(id) on delete set null,
  status                text not null default 'en_curso'
                          check (status in ('en_curso', 'finalizado', 'abandonado')),
  abandon_note          text check (char_length(abandon_note) <= 500),
  started_at            timestamptz not null default now(),
  ended_at              timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Un recorrido terminado tiene fecha de fin; uno en curso, no.
  constraint playbook_runs_fin_coherente check (
    (status = 'en_curso' and ended_at is null)
    or (status <> 'en_curso' and ended_at is not null)
  )
);

comment on table public.playbook_runs is
  'El proceso aplicado a un lead. NO es una reunion: dura semanas y abarca varias citas. La segunda reunion continua este mismo recorrido, no abre otro.';

comment on column public.playbook_runs.origin_appointment_id is
  'La cita que ORIGINO el recorrido, no "la cita del recorrido": un proceso abarca varias. El nombre es largo para que no se lea como lo segundo. on delete set null porque borrar esa cita no borra el proceso.';

comment on column public.playbook_runs.playbook_id is
  'on delete restrict: un playbook con recorridos no se borra, se archiva con is_active = false. Perder el rastro de procesos reales para limpiar una definicion es el peor intercambio posible. Mismo criterio que message_flow_steps.template_id.';

comment on column public.playbook_runs.abandon_note is
  'Texto libre y no una lista de motivos: la lista todavia no esta decidida, y un check con cinco valores inventados hoy es una migracion manana. Se estructurara cuando veinte recorridos reales digan cuales son los motivos de verdad.';

-- Un lead no ejecuta dos veces A LA VEZ el mismo proceso. Parcial, para que
-- finalizarlo o abandonarlo permita empezar uno nuevo: el historial de
-- intentos se conserva. Es el patron de message_flow_enrollments (108).
create unique index if not exists playbook_runs_uno_activo_idx
  on public.playbook_runs (lead_id, playbook_id)
  where status = 'en_curso';

create index if not exists playbook_runs_user_idx
  on public.playbook_runs (user_id, status, started_at desc);

create index if not exists playbook_runs_lead_idx
  on public.playbook_runs (lead_id, status);

-- Las dos claves foraneas sin indice propio. `playbook_id` es `restrict`: sin
-- indice, cada intento de borrar un playbook recorre entera esta tabla.
create index if not exists playbook_runs_playbook_idx
  on public.playbook_runs (playbook_id);

create index if not exists playbook_runs_origin_appointment_idx
  on public.playbook_runs (origin_appointment_id)
  where origin_appointment_id is not null;


-- ==================================================================== 5/6
-- EJECUCION: los items del recorrido (el snapshot)
-- ======================================================================

create table if not exists public.playbook_run_items (
  id                uuid primary key default gen_random_uuid(),
  run_id            uuid not null references public.playbook_runs(id) on delete cascade,
  position          integer not null check (position > 0),

  -- --- copia, no referencia -------------------------------------------
  title             text not null,
  question          text not null,
  support           text,
  section_title     text not null,
  section_position  integer not null,

  -- --- de donde salio; informativo ------------------------------------
  item_id           uuid references public.playbook_items(id) on delete set null,
  source_section_id uuid references public.playbook_sections(id) on delete set null,

  -- --- estado ---------------------------------------------------------
  state             text not null default 'pendiente'
                      check (state in ('pendiente', 'hecho', 'no_aplica')),
  note              text check (char_length(note) <= 2000),
  answered_at       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (run_id, position)
);

comment on table public.playbook_run_items is
  'Snapshot historico: los items tal como estaban al empezar el recorrido, mas su estado. Editar la definicion no puede reescribir lo que ya se pregunto.';

comment on column public.playbook_run_items.section_title is
  'La fase se copia igual que el item. Sin esto, renombrar "Fase 1 - Diagnostico" cambiaria retroactivamente la fase de todas las reuniones pasadas.';

comment on column public.playbook_run_items.item_id is
  'on delete set null, nunca cascade: quitar una pregunta de la definicion no puede borrar el historico de haberla hecho. Con cascade, el snapshot no serviria de nada.';

comment on column public.playbook_run_items.state is
  'hecho = "ya lo converse", NO "respondio que si". no_aplica = no venia al caso en esta conversacion. Nada desaparece de la lista: se tacha.';

comment on column public.playbook_run_items.answered_at is
  'CUANDO QUEDO RESUELTO el punto. Se sella al salir de pendiente y se limpia al volver a pendiente; pasar de hecho a no_aplica NO vuelve a sellar, porque el punto ya estaba resuelto y solo se corrige como se resolvio. Es ademas la semilla de las sesiones futuras: una sesion es exactamente una ventana de tiempo de respuestas, asi que playbook_sessions podra derivarse de este historico en vez de empezar sin el.';

-- Sin indice sobre (run_id, position): lo crea ya el `unique` de arriba.
--
-- Estos dos si hacen falta. Son las claves foraneas `set null`, y esta es la
-- tabla que mas crece -N filas por recorrido-: sin ellos, quitar una pregunta
-- de la definicion obliga a recorrerla entera.
create index if not exists playbook_run_items_item_idx
  on public.playbook_run_items (item_id) where item_id is not null;

create index if not exists playbook_run_items_source_section_idx
  on public.playbook_run_items (source_section_id) where source_section_id is not null;

-- Para recoger lo respondido durante una cita concreta: los items cuyo sello
-- cae entre appointments.start_time y el cierre. Es lo que prellena la minuta
-- sin necesidad de una tabla de sesiones.
create index if not exists playbook_run_items_answered_idx
  on public.playbook_run_items (run_id, answered_at)
  where answered_at is not null;

/*
 * El sello NO lo pone el cliente.
 *
 * Es el dato del que dependeran la minuta y, mas adelante, las sesiones. Una
 * sola escritura que se lo salte lo vuelve inservible para agrupar, y no
 * habria como distinguir el hueco de un item que de verdad nunca se resolvio.
 *
 * `updated_at` se mantiene aqui tambien porque ya estamos en un BEFORE UPDATE
 * y la columna, sin esto, mentiria.
 */
create or replace function public.playbook_run_item_stamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if new.state is distinct from old.state then
    if new.state = 'pendiente' then
      new.answered_at := null;
    elsif old.state = 'pendiente' then
      new.answered_at := now();
    end if;
    -- hecho <-> no_aplica: no se toca. El punto ya estaba resuelto.
  end if;

  return new;
end;
$$;

comment on function public.playbook_run_item_stamp() is
  'Sella answered_at cuando un item sale de pendiente y lo limpia cuando vuelve. Corregir hecho por no_aplica no altera el sello.';

drop trigger if exists trigger_playbook_run_item_stamp on public.playbook_run_items;
create trigger trigger_playbook_run_item_stamp
before update on public.playbook_run_items
for each row execute function public.playbook_run_item_stamp();

/*
 * EL SNAPSHOT SE CONGELA AQUI, NO EN LA POLITICA.
 *
 * La RLS filtra FILAS, no columnas: la politica de update comprueba que el
 * recorrido sea tuyo y nada mas. Sobre tu propia fila podias reescribir
 * `question`, `section_title` o incluso `run_id`, que es exactamente lo que
 * las cincuenta lineas de cabecera sobre inmutabilidad dicen que no puede
 * pasar. Una garantia que solo esta en un comentario no es una garantia.
 *
 * Es la leccion de la 145, donde el comentario de una politica de la comunidad
 * prometia impedir que una edicion moviera un comentario de hilo, y no lo
 * impedia.
 *
 * `guard` va antes que `stamp` en el alfabeto y Postgres dispara los BEFORE
 * UPDATE en ese orden: una edicion manipulada se aborta antes de sellar nada.
 */
create or replace function public.playbook_run_item_guard()
returns trigger
language plpgsql
as $$
begin
  if new.run_id           is distinct from old.run_id
  or new.position         is distinct from old.position
  or new.title            is distinct from old.title
  or new.question         is distinct from old.question
  or new.support          is distinct from old.support
  or new.section_title    is distinct from old.section_title
  or new.section_position is distinct from old.section_position
  or new.item_id          is distinct from old.item_id
  or new.source_section_id is distinct from old.source_section_id
  then
    raise exception 'El registro de lo que se pregunto no se edita: solo cambian el estado y la nota';
  end if;

  return new;
end;
$$;

comment on function public.playbook_run_item_guard() is
  'Congela la copia historica de un item del recorrido. Solo state, note y answered_at pueden cambiar. Lo que la politica de UPDATE no puede hacer por si sola, porque la RLS filtra filas y no columnas.';

drop trigger if exists trigger_playbook_run_item_guard on public.playbook_run_items;
create trigger trigger_playbook_run_item_guard
before update on public.playbook_run_items
for each row execute function public.playbook_run_item_guard();


-- ==================================================================== 6/6
-- EJECUCION: las anotaciones del recorrido
-- ======================================================================

create table if not exists public.playbook_run_notes (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references public.playbook_runs(id) on delete cascade,
  kind       text not null default 'nota' check (kind in ('nota', 'cierre')),
  body       text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.playbook_run_notes is
  'Anotaciones fechadas del proceso. Sustituye a un campo `summary` en el recorrido: un proceso de cuatro fases y varias semanas no tiene UN resumen, y un campo unico acabaria sobrescrito o mezclando la primera reunion con el seguimiento y la segunda. Es el argumento de task_notes (134): la diferencia es que una nota tiene FECHA.';

comment on column public.playbook_run_notes.kind is
  'La distincion existe desde el primer dia, no cuando haga falta: la nota de cierre se escribe YA -la pone finish_my_playbook_run- y las escritas antes de existir la columna no podrian clasificarse despues.';

create index if not exists playbook_run_notes_run_idx
  on public.playbook_run_notes (run_id, created_at desc);


-- ======================================================================
-- RLS
-- ======================================================================

alter table public.playbooks          enable row level security;
alter table public.playbook_sections  enable row level security;
alter table public.playbook_items     enable row level security;
alter table public.playbook_runs      enable row level security;
alter table public.playbook_run_items enable row level security;
alter table public.playbook_run_notes enable row level security;

-- Raiz: dueno propio.
drop policy if exists playbooks_own on public.playbooks;
create policy playbooks_own on public.playbooks
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Un salto.
drop policy if exists playbook_sections_own on public.playbook_sections;
create policy playbook_sections_own on public.playbook_sections
  for all
  using (
    exists (select 1 from public.playbooks p
            where p.id = playbook_id and p.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.playbooks p
            where p.id = playbook_id and p.user_id = (select auth.uid()))
  );

-- Dos saltos. Es el precio de no duplicar el dueno; ver la cabecera.
drop policy if exists playbook_items_own on public.playbook_items;
create policy playbook_items_own on public.playbook_items
  for all
  using (
    exists (select 1
            from public.playbook_sections s
            join public.playbooks p on p.id = s.playbook_id
            where s.id = section_id and p.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1
            from public.playbook_sections s
            join public.playbooks p on p.id = s.playbook_id
            where s.id = section_id and p.user_id = (select auth.uid()))
  );

/*
 * LA EJECUCION NO SE ESCRIBE DIRECTO. Aca se rompe el `for all`, y no por
 * gusto: `for all` incluye INSERT, y las tablas de este proyecto se escriben
 * desde el cliente con la RLS como unico portero. Con una politica de insert,
 * `start_my_playbook_run` seria un camino OPCIONAL: cualquiera podria meter a
 * mano una fila en `playbook_runs` sin sus items y dejar al lead exactamente
 * en el estado que esta migracion dice evitar -recorrido roto que el indice
 * unico impide reemplazar-.
 *
 * Sin politica de INSERT, crear un recorrido y sus items solo puede pasar por
 * la funcion, que es SECURITY DEFINER y por tanto se salta la RLS.
 *
 * Tampoco hay politica de DELETE en el recorrido ni en sus items: un recorrido
 * equivocado se ABANDONA, que libera el indice parcial y deja constancia.
 * Borrarlo perderia el historico, que es lo unico que esta tabla aporta.
 */
drop policy if exists playbook_runs_own on public.playbook_runs;

create policy playbook_runs_select_own on public.playbook_runs
  for select using (user_id = (select auth.uid()));

create policy playbook_runs_update_own on public.playbook_runs
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists playbook_run_items_own on public.playbook_run_items;

create policy playbook_run_items_select_own on public.playbook_run_items
  for select using (
    exists (select 1 from public.playbook_runs r
            where r.id = run_id and r.user_id = (select auth.uid()))
  );

create policy playbook_run_items_update_own on public.playbook_run_items
  for update
  using (
    exists (select 1 from public.playbook_runs r
            where r.id = run_id and r.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.playbook_runs r
            where r.id = run_id and r.user_id = (select auth.uid()))
  );

/*
 * Las notas SI se insertan desde el cliente -son anotaciones que se van
 * agregando-, pero NO se editan. Es la decision de `task_notes` (134), que
 * deliberadamente no tiene politica de UPDATE: una nota fechada que se puede
 * reescribir deja de ser un registro. Alcanza tambien a la nota de cierre.
 */
drop policy if exists playbook_run_notes_own on public.playbook_run_notes;

create policy playbook_run_notes_select_own on public.playbook_run_notes
  for select using (
    exists (select 1 from public.playbook_runs r
            where r.id = run_id and r.user_id = (select auth.uid()))
  );

create policy playbook_run_notes_insert_own on public.playbook_run_notes
  for insert with check (
    exists (select 1 from public.playbook_runs r
            where r.id = run_id and r.user_id = (select auth.uid()))
  );

create policy playbook_run_notes_delete_own on public.playbook_run_notes
  for delete using (
    exists (select 1 from public.playbook_runs r
            where r.id = run_id and r.user_id = (select auth.uid()))
  );


-- ======================================================================
-- EMPEZAR UN RECORRIDO
-- ======================================================================
--
-- Crear el recorrido y volcar sus items NO pueden ser dos llamadas. Un
-- recorrido sin items esta roto, y el indice unico parcial impide crear otro
-- para reemplazarlo: quedaria un lead bloqueado sin forma de empezar.
--
-- SECURITY DEFINER se salta la RLS, asi que la pertenencia del playbook, del
-- lead y de la cita se comprueba aqui a mano o no se comprueba.

create or replace function public.start_my_playbook_run(
  p_playbook_id           uuid,
  p_lead_id               uuid,
  p_origin_appointment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_run_id  uuid;
  v_items   integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.playbooks p
    where p.id = p_playbook_id and p.user_id = v_user_id and p.is_active
  ) then
    raise exception 'El playbook no existe o esta archivado';
  end if;

  -- `deleted_at is null` no es opcional: `leads` usa borrado logico, y todas
  -- las demas RPC que validan pertenencia de un lead lo exigen (039, 057, 061,
  -- 062, 098, 100). Sin el, un lead borrado podria quedar con un recorrido
  -- activo enganchado para siempre, porque el indice parcial bloquea el
  -- reintento mientras siga `en_curso`.
  if not exists (
    select 1 from public.leads l
    where l.id = p_lead_id and l.user_id = v_user_id and l.deleted_at is null
  ) then
    raise exception 'El lead no existe';
  end if;

  if p_origin_appointment_id is not null and not exists (
    select 1 from public.appointments a
    where a.id = p_origin_appointment_id and a.user_id = v_user_id
  ) then
    raise exception 'La cita no existe';
  end if;

  -- Se deja que el indice unico parcial hable en vez de comprobar antes: entre
  -- la comprobacion y el insert cabe otro toque, y el indice es la unica
  -- garantia real. El cliente traduce el 23505 a "ya hay un recorrido en
  -- curso" y lleva a el.
  insert into public.playbook_runs (playbook_id, user_id, lead_id, origin_appointment_id)
  values (p_playbook_id, v_user_id, p_lead_id, p_origin_appointment_id)
  returning id into v_run_id;

  insert into public.playbook_run_items (
    run_id, position,
    title, question, support, section_title, section_position,
    item_id, source_section_id
  )
  select
    v_run_id,
    row_number() over (order by s.position, i.position),
    i.title, i.question, i.support, s.title, s.position,
    i.id, s.id
  from public.playbook_items i
  join public.playbook_sections s on s.id = i.section_id
  where s.playbook_id = p_playbook_id;

  get diagnostics v_items = row_count;

  -- Un playbook sin items no es un recorrido, es una fila vacia que despues
  -- bloquea al lead. Se aborta y no se guarda nada.
  if v_items = 0 then
    raise exception 'El playbook no tiene preguntas todavia';
  end if;

  return v_run_id;
end;
$$;

comment on function public.start_my_playbook_run(uuid, uuid, uuid) is
  'Crea un recorrido y vuelca sus items en una sola transaccion: un recorrido sin items no se puede reemplazar, porque el indice unico impediria crear otro.';


-- ======================================================================
-- CERRAR UN RECORRIDO
-- ======================================================================
--
-- Finalizar o abandonar, dejar la nota de cierre y, si se pide, copiarla a la
-- ficha del lead. Modelada sobre close_my_appointment (147): lo que la
-- pantalla presenta como un boton tiene que ser una transaccion, o un fallo a
-- mitad deja el recorrido cerrado con la nota sin escribir y sin forma de
-- reintentarlo, porque ya no aparece entre los que estan en curso.

create or replace function public.finish_my_playbook_run(
  p_run_id         uuid,
  p_status         text,
  p_note           text default null,
  p_also_lead_note boolean default false
)
returns table (
  run_id       uuid,
  status       text,
  ended_at     timestamptz,
  note_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_run     record;
  v_texto   text := nullif(trim(coalesce(p_note, '')), '');
  v_nota    boolean := false;
  v_fin     timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_status not in ('finalizado', 'abandonado') then
    raise exception 'Estado no valido: %', p_status;
  end if;

  select r.* into v_run
  from public.playbook_runs r
  where r.id = p_run_id and r.user_id = v_user_id
  for update;

  if not found then
    raise exception 'El recorrido no existe';
  end if;

  if v_run.status <> 'en_curso' then
    raise exception 'El recorrido ya esta %', v_run.status;
  end if;

  update public.playbook_runs
  set status       = p_status,
      ended_at     = v_fin,
      abandon_note = case when p_status = 'abandonado' then v_texto else abandon_note end,
      updated_at   = v_fin
  where id = p_run_id;

  if v_texto is not null then
    insert into public.playbook_run_notes (run_id, kind, body)
    values (p_run_id, 'cierre', v_texto);
  end if;

  if v_texto is not null and p_also_lead_note then
    insert into public.lead_notes (lead_id, user_id, content)
    values (v_run.lead_id, v_user_id, v_texto);
    v_nota := true;
  end if;

  return query select p_run_id, p_status, v_fin, v_nota;
end;
$$;

comment on function public.finish_my_playbook_run(uuid, text, text, boolean) is
  'Finaliza o abandona un recorrido y escribe su nota de cierre -y opcionalmente la copia a la ficha del lead- en una sola transaccion.';


-- ======================================================================
-- PERMISOS
-- ======================================================================
--
-- Con la firma completa. Revocar solo de `anon` no basta si el permiso llega
-- via PUBLIC: es la leccion de las migraciones 141 y 142.

revoke all on function public.start_my_playbook_run(uuid, uuid, uuid) from public;
revoke all on function public.start_my_playbook_run(uuid, uuid, uuid) from anon;
grant execute on function public.start_my_playbook_run(uuid, uuid, uuid) to authenticated;

revoke all on function public.finish_my_playbook_run(uuid, text, text, boolean) from public;
revoke all on function public.finish_my_playbook_run(uuid, text, text, boolean) from anon;
grant execute on function public.finish_my_playbook_run(uuid, text, text, boolean) to authenticated;
