-- 131 - El segundo eje de las tareas: importante
--
-- Hasta ahora una tarea solo tenia fecha de vencimiento, o sea un unico eje:
-- URGENCIA. Con eso alcanza para ordenar por fecha, que es lo que ya hacia la
-- lista, pero no para lo que propone la matriz de Eisenhower.
--
-- La idea de esa matriz es justamente que urgente e importante son ejes
-- DISTINTOS, y que lo urgente tapa a lo importante si no se los separa. Sin
-- este campo cualquier "matriz" seria falsa: cuatro casillas alimentadas por
-- una sola variable.
--
-- Se elige un booleano y no una escala de prioridad de 1 a 5. La matriz pide
-- una respuesta binaria -¿esto me acerca a un objetivo, si o no?- y una escala
-- termina con todo en el medio, que es como no tener el dato.
--
-- Por defecto `false`: una tarea recien creada no es importante hasta que
-- alguien lo diga. Al reves -que todo naciera importante- vaciaria el eje.

alter table public.tasks
add column if not exists is_important boolean not null default false;

comment on column public.tasks.is_important is
  'Segundo eje de la matriz de Eisenhower. La urgencia sale de due_date; esto dice si la tarea acerca a un objetivo.';

-- La matriz filtra por este campo dentro de las tareas del usuario, que ya
-- estan acotadas por RLS. El indice parcial solo cubre las importantes, que son
-- las pocas: un indice sobre un booleano entero no lo usaria nadie.
create index if not exists tasks_importantes_idx
  on public.tasks (user_id)
  where is_important;

notify pgrst, 'reload schema';
