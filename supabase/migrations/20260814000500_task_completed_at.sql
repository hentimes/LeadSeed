-- task_completed_at
--
-- Tipo:           query permanente (columna nueva + trigger)
-- Objeto:         public.tasks
-- Clase:          captura de dato que hoy no existe
-- Persistencia:   permanente
-- Reversibilidad: total (drop trigger, drop function, drop column)
--
-- PROPOSITO
--
-- El panel muestra "Tareas completadas (hoy)". Ese numero **no cuenta lo que
-- dice**: la funcion lo calcula como
--
--   status = 'completada' and created_at >= hoy
--
-- es decir, tareas *creadas* hoy que ademas estan completadas. Una tarea creada
-- el lunes y completada hoy no aparece; una creada hoy y completada hoy si. El
-- numero es real en el sentido de que sale de la base, pero mide otra cosa
-- distinta de la que anuncia, que a efectos del usuario es igual de enganoso que
-- una constante.
--
-- `tasks` no tiene donde guardar cuando se completo: solo hay `created_at` y
-- `due_date`, ni siquiera `updated_at`. Esta migracion crea ese sitio.
--
-- POR QUE UN TRIGGER Y NO ESCRIBIRLO DESDE LA APLICACION
--
-- Una tarea se puede completar desde la lista de tareas, desde la ficha del lead
-- y desde la agenda. Si el sello lo pusiera cada pantalla, bastaria con que una
-- se olvidara para que el conteo volviera a mentir, y el fallo seria silencioso.
-- El trigger lo garantiza para cualquier camino de escritura, incluido un update
-- hecho a mano contra la base.
--
-- El trigger tambien **limpia el sello si la tarea se reabre**, para que no quede
-- una fecha de completado en una tarea pendiente contradiciendo al estado. Es la
-- misma regla que se aplico al motivo de descarte.
--
-- SOBRE LAS TAREAS YA COMPLETADAS
--
-- Quedan con `completed_at` en nulo y **no se rellenan**. No se sabe cuando se
-- completaron: usar `created_at` como sustituto seria fabricar el dato otra vez,
-- que es justo lo que esta migracion viene a corregir.
--
-- Consecuencia visible: el dia que esto se aplique, "completadas hoy" mostrara
-- solo las que se completen de aqui en adelante. `completedTotal`, que cuenta por
-- estado y no por fecha, no cambia.
--
-- IMPACTO
--
-- Escritura: una columna de fecha nula por defecto; ninguna fila existente
-- cambia. El trigger solo hace trabajo cuando el estado cambia de verdad.
-- Lectura: el indice parcial cubre solo las tareas completadas con sello.

alter table public.tasks
  add column if not exists completed_at timestamptz;

comment on column public.tasks.completed_at is
  'Cuando la tarea paso a completada. Lo pone el trigger tasks_set_completed_at. Nulo si esta pendiente, o si se completo antes de que existiera esta columna.';

create or replace function public.tasks_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  -- Alta ya completada: sellar en el momento.
  if tg_op = 'INSERT' then
    if new.status = 'completada' and new.completed_at is null then
      new.completed_at := now();
    end if;
    return new;
  end if;

  -- Solo interesa el cambio de estado. Renombrar la tarea no debe mover el sello.
  if new.status is distinct from old.status then
    if new.status = 'completada' then
      -- `coalesce` para no pisar un sello que venga explicito en el update.
      new.completed_at := coalesce(new.completed_at, now());
    else
      -- Se reabrio: el sello deja de tener sentido.
      new.completed_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_set_completed_at on public.tasks;

create trigger tasks_set_completed_at
  before insert or update on public.tasks
  for each row
  execute function public.tasks_set_completed_at();

-- Parcial: la unica consulta que lo usa filtra por completadas dentro de una
-- ventana de un dia.
create index if not exists tasks_completed_at_idx
  on public.tasks (user_id, completed_at)
  where completed_at is not null;

-- REVERSION
--
--   drop index if exists public.tasks_completed_at_idx;
--   drop trigger if exists tasks_set_completed_at on public.tasks;
--   drop function if exists public.tasks_set_completed_at();
--   alter table public.tasks drop column if exists completed_at;
