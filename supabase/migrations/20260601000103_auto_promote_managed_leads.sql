-- 062 - Un lead gestionado deja de estar "nuevo"
--
-- Hoy 'nuevo' no significa "esta en la etapa nuevo", significa "todavia no
-- tiene etapa": 1968 de 1974 leads lo tienen. Por eso la etiqueta no se caia
-- nunca sola y el tablero mostraba una columna con casi todo adentro.
--
-- El tablero ya trabaja con 4 etapas reales (contactado, interesado,
-- convertido, descartado) y cuenta 'nuevo' aparte, asi que el modelo de 4
-- estados ya existe. Lo que faltaba era que 'nuevo' se apagara solo.
--
-- Se define gestionar como: cambiarle la etapa, escribirle, o agendarle algo.
-- Las dos ultimas se resuelven aca con triggers y no en los servicios, porque
-- asi tambien quedan cubiertos los envios hechos desde edge functions y
-- cualquier via futura que no pase por la extension.
--
-- Regla unica y sin excepciones: solo se promueve desde 'nuevo' (o nulo) hacia
-- 'contactado'. Nunca se toca un lead que ya tiene etapa, asi que es imposible
-- que un envio haga retroceder a un lead 'convertido' o reviva uno
-- 'descartado'.

create or replace function public.promote_lead_to_contacted()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.lead_id is null then
    return new;
  end if;

  update public.leads
  set status = 'contactado',
      updated_at = now()
  where id = new.lead_id
    and coalesce(status, 'nuevo') = 'nuevo';

  return new;
end;
$fn$;

comment on function public.promote_lead_to_contacted() is
  'Saca al lead de "nuevo" cuando se lo gestiona. Solo promueve desde nuevo/nulo: nunca hace retroceder una etapa ya asignada.';

-- Envio de WhatsApp o correo
drop trigger if exists send_logs_promote_lead on public.send_logs;
create trigger send_logs_promote_lead
  after insert on public.send_logs
  for each row
  execute function public.promote_lead_to_contacted();

-- Cita agendada
drop trigger if exists appointments_promote_lead on public.appointments;
create trigger appointments_promote_lead
  after insert on public.appointments
  for each row
  execute function public.promote_lead_to_contacted();

-- Tarea creada
drop trigger if exists tasks_promote_lead on public.tasks;
create trigger tasks_promote_lead
  after insert on public.tasks
  for each row
  execute function public.promote_lead_to_contacted();

-- ---------------------------------------------------------------------------
-- Regularizar el historial
-- ---------------------------------------------------------------------------
-- Los leads que ya fueron gestionados antes de existir estos triggers siguen
-- figurando como nuevos. Se los promueve una sola vez con el mismo criterio.
update public.leads l
set status = 'contactado',
    updated_at = now()
where coalesce(l.status, 'nuevo') = 'nuevo'
  and l.deleted_at is null
  and (
    exists (select 1 from public.send_logs s where s.lead_id = l.id)
    or exists (select 1 from public.appointments a where a.lead_id = l.id)
    or exists (select 1 from public.tasks t where t.lead_id = l.id)
  );
