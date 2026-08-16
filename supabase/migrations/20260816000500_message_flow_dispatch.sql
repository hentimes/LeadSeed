-- message_flow_dispatch
--
-- Tipo:           query permanente (indices + check + funciones + triggers)
-- Objeto:         public.message_flow_steps, message_flow_enrollments,
--                 message_flow_progress, leads (trigger nuevo)
-- Clase:          correccion de la 108 + capacidad nueva (motor de despacho)
-- Persistencia:   permanente
-- Reversibilidad: total (ver REVERSION al final)
--
-- PROPOSITO
--
-- La 108 crea el modelo de flujos de mensajes pero no como se recorren. Esta
-- migracion:
--
--   1. Corrige tres huecos encontrados en la revision de la 108: dos indices
--      de FK que faltaban y una validacion que el trigger de herencia de
--      dueño no hacia (un paso de progreso podia apuntar a un step de un
--      flujo distinto al de su inscripcion).
--   2. Agrega el motor: cola de envio de hoy, promocion de pendiente a toca,
--      inscripcion atomica, salida automatica al convertir/descartar, y
--      avance de paso al registrar un envio.
--
-- DECISION: LAS FILAS DE PROGRESO SE CREAN DE A UNA, NO TODAS AL INSCRIBIR
--
-- `enroll_lead_in_flow` solo crea la fila de progreso del primer paso. Las
-- siguientes las crea `message_flow_progress_avanza_paso` cuando el paso
-- anterior se marca `registrado`, con el `due_at` recalculado en ese momento
-- (`wait_days` se cuenta "desde que se registro el paso anterior", no desde
-- la inscripcion). Crear las N filas de una vez obligaria a dejar `due_at` en
-- null para los pasos 2..N y a recalcularlo despues de todas formas; no hay
-- ganancia y si mas superficie para que quede inconsistente.
--
-- DECISION: "PENDIENTE" A "TOCA" SE RESUELVE AL CONSULTAR, NO POR CRON
--
-- Se sostiene, con una condicion: **todo lector de `message_flow_progress`
-- que necesite el estado vigente debe promover antes de leer**, no solo la
-- cola de envio. Por eso la promocion vive en una funcion propia
-- (`promote_due_flow_steps`) que `get_my_flow_dispatch_queue` llama al
-- entrar. Si en el futuro se agrega otro lector (p. ej. un contador en el
-- dashboard), debe llamarla tambien; si no, ese lector vera "pendiente"
-- donde ya toca. Es barata: un solo `UPDATE` acotado por el indice parcial
-- `message_flow_progress_pendiente_idx` que ya existe desde la 108.
--
-- DECISION: SALIDA AUTOMATICA POR TRIGGER, NO AL CONSULTAR
--
-- A diferencia de "responder", "convertirse" o "descartarse" **si** son
-- señales que el sistema ya tiene (columna `leads.status`). Resolverlo solo
-- al consultar la cola dejaria la inscripcion como `activa` para siempre si
-- el usuario no vuelve a abrir esa pantalla, y el historial de
-- `exit_reason` -que existe para reportar por que salio cada lead- quedaria
-- mintiendo. El trigger es barato: solo se dispara cuando `status` cambia.
--
-- DECISION: AVANCE DE PASO POR TRIGGER, NO POR RPC
--
-- Registrar un envio no pasa siempre por el mismo camino (hoy hay uno, puede
-- haber mas). Atar el avance a un `UPDATE ... SET status = 'registrado'`
-- garantiza el invariante sin importar quien puso ese estado, y en la misma
-- transaccion.

-- --------------------------------------------- 1. Correcciones de la 108

create index if not exists message_flow_enrollments_lead_idx
  on public.message_flow_enrollments (lead_id);

create index if not exists message_flow_progress_step_idx
  on public.message_flow_progress (step_id);

create index if not exists message_flow_steps_template_idx
  on public.message_flow_steps (template_id);

alter table public.message_flow_enrollments
  drop constraint if exists message_flow_enrollments_salida_consistente;

alter table public.message_flow_enrollments
  add constraint message_flow_enrollments_salida_consistente
  check (
    (status = 'activa' and exited_at is null and exit_reason is null)
    or (status <> 'activa' and exited_at is not null and exit_reason is not null)
  );

comment on constraint message_flow_enrollments_salida_consistente
  on public.message_flow_enrollments is
  'Una inscripcion activa no tiene fecha ni motivo de salida, y una que no esta activa tiene las dos. Sin esto se podia dejar status=salida sin exited_at.';

-- Version corregida del trigger de la 108: ahora tambien valida que el paso
-- referenciado por una fila de progreso pertenezca al mismo flujo que su
-- inscripcion. Sin esto se podia insertar una fila de progreso con el
-- enrollment de un flujo y el step de otro flujo distinto del mismo dueño:
-- pasaba la FK (el step existe), pasaba la RLS (mismo user_id) y pasaba el
-- unique(enrollment_id, step_id) por ser la primera fila.
create or replace function public.message_flow_hija_hereda_dueno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_channel text;
  v_flow_id uuid;
  v_step_flow_id uuid;
begin
  if tg_table_name = 'message_flow_progress' then
    select e.user_id, e.flow_id into v_user_id, v_flow_id
    from public.message_flow_enrollments e
    where e.id = new.enrollment_id;

    if v_user_id is null then
      raise exception 'la inscripcion % no existe', new.enrollment_id;
    end if;

    select s.flow_id into v_step_flow_id
    from public.message_flow_steps s
    where s.id = new.step_id;

    if v_step_flow_id is null then
      raise exception 'el paso % no existe', new.step_id;
    end if;

    if v_step_flow_id <> v_flow_id then
      raise exception 'el paso % no pertenece al flujo de la inscripcion %', new.step_id, new.enrollment_id;
    end if;
  else
    select f.user_id, f.channel into v_user_id, v_channel
    from public.message_flows f
    where f.id = new.flow_id;

    if v_user_id is null then
      raise exception 'el flujo % no existe', new.flow_id;
    end if;

    -- El canal tampoco se acepta del cliente: sale del flujo.
    if tg_table_name = 'message_flow_enrollments' then
      new.channel := v_channel;
    end if;
  end if;

  new.user_id := v_user_id;
  return new;
end;
$$;

-- ---------------------------------- 2. Promocion de pendiente a toca

create or replace function public.promote_due_flow_steps()
returns void
language sql
security definer
set search_path = public
as $$
  update public.message_flow_progress p
  set status = 'toca',
      updated_at = now()
  where p.user_id = auth.uid()
    and p.status = 'pendiente'
    and p.due_at is not null
    and p.due_at <= now();
$$;

revoke all on function public.promote_due_flow_steps() from public;
grant execute on function public.promote_due_flow_steps() to authenticated;

comment on function public.promote_due_flow_steps() is
  'Pasa a toca los pasos propios cuyo due_at ya vencio. Idempotente: no reordena nada si se llama dos veces. Sostenida por message_flow_progress_pendiente_idx (108).';

-- --------------------------------------------- 3. Cola de envio de hoy

create or replace function public.get_my_flow_dispatch_queue()
returns table (
  progress_id bigint,
  enrollment_id bigint,
  lead_id uuid,
  lead_name text,
  lead_phone text,
  lead_email text,
  flow_id uuid,
  flow_name text,
  channel text,
  step_id bigint,
  step_order integer,
  template_id uuid,
  template_name text,
  due_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.promote_due_flow_steps();

  return query
  select
    p.id,
    p.enrollment_id,
    l.id,
    l.name,
    l.phone,
    l.email,
    f.id,
    f.name,
    f.channel,
    s.id,
    s.step_order,
    t.id,
    t.name,
    p.due_at
  from public.message_flow_progress p
  join public.message_flow_enrollments e on e.id = p.enrollment_id
  join public.message_flows f on f.id = e.flow_id
  join public.message_flow_steps s on s.id = p.step_id
  join public.templates t on t.id = s.template_id
  join public.leads l on l.id = e.lead_id
  where p.user_id = auth.uid()
    and p.status = 'toca'
    and e.status = 'activa'
    and l.deleted_at is null
  order by p.due_at asc, p.id asc;
end;
$$;

revoke all on function public.get_my_flow_dispatch_queue() from public;
grant execute on function public.get_my_flow_dispatch_queue() to authenticated;

comment on function public.get_my_flow_dispatch_queue() is
  'Que falta enviar hoy: promueve pendiente->toca y devuelve la cola propia, mas vieja primero. Coste: un UPDATE y un SELECT, ambos sostenidos por message_flow_progress_pendiente_idx (user_id, due_at) where status in (pendiente, toca); el resto son joins por PK.';

-- ------------------------------------------------- 4. Inscripcion atomica

create or replace function public.enroll_lead_in_flow(
  p_flow_id uuid,
  p_lead_id uuid
)
returns public.message_flow_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel text;
  v_is_active boolean;
  v_enrollment public.message_flow_enrollments;
  v_first_step_id bigint;
  v_first_wait integer;
begin
  select channel, is_active into v_channel, v_is_active
  from public.message_flows
  where id = p_flow_id
    and user_id = auth.uid();

  if v_channel is null then
    raise exception 'el flujo % no existe o no es tuyo', p_flow_id;
  end if;

  if not v_is_active then
    raise exception 'el flujo % esta desactivado', p_flow_id;
  end if;

  if not exists (
    select 1 from public.leads
    where id = p_lead_id
      and user_id = auth.uid()
      and deleted_at is null
  ) then
    raise exception 'el lead % no existe o no es tuyo', p_lead_id;
  end if;

  select id, wait_days into v_first_step_id, v_first_wait
  from public.message_flow_steps
  where flow_id = p_flow_id
  order by step_order asc
  limit 1;

  if v_first_step_id is null then
    raise exception 'el flujo % no tiene pasos definidos', p_flow_id;
  end if;

  -- Si ya hay una inscripcion activa del mismo lead y canal, el indice unico
  -- parcial de la 108 (message_flow_enrollments_una_activa_por_canal_idx)
  -- revienta el insert aqui con un error de restriccion. Se deja subir tal
  -- cual: es la señal correcta para que el cliente la traduzca.
  insert into public.message_flow_enrollments (flow_id, user_id, lead_id, channel)
  values (p_flow_id, auth.uid(), p_lead_id, v_channel)
  returning * into v_enrollment;

  insert into public.message_flow_progress (enrollment_id, step_id, user_id, status, due_at)
  values (
    v_enrollment.id,
    v_first_step_id,
    auth.uid(),
    'pendiente',
    v_enrollment.enrolled_at + make_interval(days => v_first_wait)
  );

  return v_enrollment;
end;
$$;

revoke all on function public.enroll_lead_in_flow(uuid, uuid) from public;
grant execute on function public.enroll_lead_in_flow(uuid, uuid) to authenticated;

comment on function public.enroll_lead_in_flow(uuid, uuid) is
  'Inscribe un lead propio en un flujo propio y crea la fila de progreso del primer paso, en una sola transaccion implicita. Falla si el flujo esta inactivo, no tiene pasos, o el lead ya tiene una inscripcion activa del mismo canal.';

-- -------------------------------------- 5. Salida automatica del flujo

create or replace function public.leads_salida_de_flujos_activos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_reason := case new.status
    when 'convertido' then 'convertido'
    when 'descartado' then 'descartado'
    else null
  end;

  if v_reason is null then
    return new;
  end if;

  with cerradas as (
    update public.message_flow_enrollments
    set status = 'salida',
        exited_at = now(),
        exit_reason = v_reason,
        updated_at = now()
    where lead_id = new.id
      and status = 'activa'
    returning id
  )
  update public.message_flow_progress p
  set status = 'omitido',
      updated_at = now()
  from cerradas c
  where p.enrollment_id = c.id
    and p.status in ('pendiente', 'toca');

  return new;
end;
$$;

drop trigger if exists leads_salida_de_flujos_activos on public.leads;
create trigger leads_salida_de_flujos_activos
  after update of status on public.leads
  for each row
  when (new.status is distinct from old.status)
  execute function public.leads_salida_de_flujos_activos();

comment on function public.leads_salida_de_flujos_activos() is
  'Cuando un lead pasa a convertido o descartado, cierra sus inscripciones activas y omite el paso pendiente/toca que tuvieran. No cubre "respondio": esa señal no existe en el esquema.';

-- ------------------------------------------------------ 6. Avance de paso

create or replace function public.message_flow_progress_avanza_paso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flow_id uuid;
  v_current_order integer;
  v_next_step_id bigint;
  v_next_wait integer;
  v_base timestamptz;
begin
  if new.status <> 'registrado' or old.status is not distinct from 'registrado' then
    return new;
  end if;

  select e.flow_id into v_flow_id
  from public.message_flow_enrollments e
  where e.id = new.enrollment_id;

  select step_order into v_current_order
  from public.message_flow_steps
  where id = new.step_id;

  select id, wait_days into v_next_step_id, v_next_wait
  from public.message_flow_steps
  where flow_id = v_flow_id
    and step_order > v_current_order
  order by step_order asc
  limit 1;

  if v_next_step_id is null then
    update public.message_flow_enrollments
    set status = 'completada',
        exited_at = now(),
        exit_reason = 'fin_secuencia',
        updated_at = now()
    where id = new.enrollment_id
      and status = 'activa';
  else
    v_base := coalesce(new.dispatched_at, now());

    insert into public.message_flow_progress (enrollment_id, step_id, user_id, status, due_at)
    values (
      new.enrollment_id,
      v_next_step_id,
      new.user_id,
      'pendiente',
      v_base + make_interval(days => v_next_wait)
    )
    on conflict (enrollment_id, step_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists message_flow_progress_avanza_paso on public.message_flow_progress;
create trigger message_flow_progress_avanza_paso
  after update of status on public.message_flow_progress
  for each row
  when (new.status = 'registrado' and old.status is distinct from 'registrado')
  execute function public.message_flow_progress_avanza_paso();

comment on function public.message_flow_progress_avanza_paso() is
  'Al registrar un paso, crea el progreso del siguiente con su due_at recalculado, o cierra la inscripcion como completada si era el ultimo. on conflict do nothing la hace segura ante un reintento de la misma transaccion.';

-- REVERSION
--
--   drop trigger if exists message_flow_progress_avanza_paso on public.message_flow_progress;
--   drop function if exists public.message_flow_progress_avanza_paso();
--   drop trigger if exists leads_salida_de_flujos_activos on public.leads;
--   drop function if exists public.leads_salida_de_flujos_activos();
--   drop function if exists public.enroll_lead_in_flow(uuid, uuid);
--   drop function if exists public.get_my_flow_dispatch_queue();
--   drop function if exists public.promote_due_flow_steps();
--   alter table public.message_flow_enrollments
--     drop constraint if exists message_flow_enrollments_salida_consistente;
--   drop index if exists public.message_flow_steps_template_idx;
--   drop index if exists public.message_flow_progress_step_idx;
--   drop index if exists public.message_flow_enrollments_lead_idx;
--
--   Para message_flow_hija_hereda_dueno: volver a aplicar el CREATE OR REPLACE
--   de la 108 (sin la validacion de step_flow_id = enrollment_flow_id).

NOTIFY pgrst, 'reload schema';
