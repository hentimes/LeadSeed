-- flow_resume
--
-- Tipo:           dos funciones nuevas
-- Objeto:         public.flow_resume_points(uuid), public.enroll_lead_in_flow_from(uuid, uuid, integer, timestamptz)
-- Clase:          una de lectura agregada, otra de escritura atomica
-- Persistencia:   permanente
-- Reversibilidad: total (drop de ambas; no cambian ninguna tabla)
--
-- PROPOSITO
--
-- Inscribir a alguien en un flujo POR DONDE VA, y no siempre desde el principio.
--
-- Hoy `enroll_lead_in_flow` crea la inscripcion y la fila de progreso del PRIMER
-- paso, siempre. Pero el caso normal de este producto es el contrario: los
-- flujos se arman despues de haber estado escribiendo a mano, asi que media
-- agenda ya recibio el mensaje del paso 1 -a veces el del 2- antes de que el
-- flujo existiera. Inscribirlos desde el principio les vuelve a mandar lo mismo,
-- que es el error mas caro de esta aplicacion.
--
-- Son dos funciones porque son dos momentos: primero se AVERIGUA por donde va
-- cada lead -para poder ofrecerlo en pantalla-, y despues se INSCRIBE en el
-- punto que el usuario acepto.
--
-- ---------------------------------------------------------------------------
-- 1. flow_resume_points: por que paso va cada lead, segun lo ya enviado
-- ---------------------------------------------------------------------------
--
-- Cruza `send_logs` con los pasos del flujo por `template_id` y devuelve, por
-- lead, el paso mas avanzado que ya recibio y cuando lo recibio.
--
-- POR QUE EN EL SERVIDOR Y NO CRUZANDOLO EN EL NAVEGADOR
--
-- Es la misma decision que documenta la 138 para `lead_send_summary`: traerse
-- `send_logs` al cliente hace crecer el coste con los MENSAJES enviados -lo que
-- mas crece en este producto- cuando lo que la pantalla necesita crece con los
-- LEADS. Aqui viaja una fila por lead que tenga algo, y en la mayoria de los
-- casos son unas pocas.
--
-- QUE CUENTA COMO "YA RECIBIDO"
--
-- Que exista un envio de esa plantilla a ese lead. No se mira el canal: si la
-- plantilla es la del paso, el mensaje de ese paso ya salio. Tampoco se
-- descuentan los envios ocultos del historial, por el mismo motivo que la 138:
-- limpiar una vista no deshace un envio.
--
-- Si una plantilla esta en dos pasos del mismo flujo, gana el paso mas
-- avanzado: es la lectura prudente -no volver a mandar lo que ya se mando- y
-- el usuario siempre puede elegir empezar desde el principio.
--
-- ---------------------------------------------------------------------------
-- 2. enroll_lead_in_flow_from: inscribir a partir de un paso
-- ---------------------------------------------------------------------------
--
-- Igual que `enroll_lead_in_flow` pero con dos parametros mas: cual es el
-- ultimo paso que se da por hecho y desde que fecha contar la espera del
-- siguiente.
--
-- Con `p_last_done_order = 0` hace exactamente lo mismo que la original, asi
-- que la aplicacion puede llamar solo a esta. La original se conserva: hay
-- extensiones instaladas con el bundle viejo, y quitarle la funcion a un cliente
-- que sigue llamandola le rompe el boton de inscribir.
--
-- LOS PASOS YA HECHOS SE ESCRIBEN COMO 'registrado', NO SE OMITEN
--
-- Podrian no crearse: el progreso admite huecos y `computeFlowProgress` trata un
-- paso sin fila como pendiente. Pero entonces la barra del lead diria "0 de 3"
-- para alguien que ya recibio dos mensajes, y el riel lo pintaria como recien
-- llegado. Escribirlos deja el estado diciendo la verdad: se registraron, con la
-- fecha real del envio.
--
-- No disparan el trigger de avance -`message_flow_progress_avanza_paso` es
-- `after update`, no `after insert`-, asi que la funcion controla exactamente
-- que filas quedan y no hay una cascada compitiendo con ella.
--
-- LA ESPERA DEL SIGUIENTE SE CUENTA DESDE EL ENVIO REAL
--
-- `p_base` es la fecha del ultimo mensaje que se le mando, no el momento de
-- inscribirlo. Un flujo que dice "3 dias despues del anterior" y a alguien a
-- quien le escribiste hace cinco tiene que quedar vencido HOY, no dentro de
-- tres dias. Si no se pasa, se usa el momento de la inscripcion.
--
-- SEGURIDAD
--
-- `flow_resume_points` es `SECURITY INVOKER`: las politicas de `send_logs` y de
-- `message_flow_steps` filtran solas.
--
-- `enroll_lead_in_flow_from` es `SECURITY DEFINER`, igual que la original de la
-- 109 y por el mismo motivo: escribe en tres tablas cuyo `user_id` pone un
-- trigger, y comprueba a mano que el flujo y el lead sean de `auth.uid()` antes
-- de tocar nada.

-- ------------------------------------------------------------------ LECTURA

CREATE OR REPLACE FUNCTION public.flow_resume_points(p_flow_id uuid)
RETURNS TABLE (
  lead_id uuid,
  last_done_order integer,
  last_sent_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (s.lead_id)
    s.lead_id,
    st.step_order,
    s.sent_at
  FROM public.send_logs s
  JOIN public.message_flow_steps st
    ON st.template_id = s.template_id
   AND st.flow_id = p_flow_id
  WHERE s.lead_id IS NOT NULL
  -- El paso mas avanzado primero y, dentro de el, el envio mas reciente: es la
  -- fecha desde la que hay que contar la espera del paso siguiente.
  ORDER BY s.lead_id, st.step_order DESC, s.sent_at DESC;
$$;

COMMENT ON FUNCTION public.flow_resume_points(uuid) IS
  'Por que paso de un flujo va cada lead segun lo que ya se le envio: el paso mas avanzado cuya plantilla recibio, y cuando. Una fila por lead. Respeta RLS por SECURITY INVOKER.';

GRANT EXECUTE ON FUNCTION public.flow_resume_points(uuid) TO authenticated;

-- ---------------------------------------------------------------- ESCRITURA

CREATE OR REPLACE FUNCTION public.enroll_lead_in_flow_from(
  p_flow_id uuid,
  p_lead_id uuid,
  p_last_done_order integer DEFAULT 0,
  p_base timestamptz DEFAULT NULL
)
RETURNS public.message_flow_enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_channel text;
  v_is_active boolean;
  v_enrollment public.message_flow_enrollments;
  v_next_step_id bigint;
  v_next_wait integer;
  v_base timestamptz;
  v_hechos integer;
begin
  if p_last_done_order is null or p_last_done_order < 0 then
    raise exception 'el paso de partida % no es valido', p_last_done_order;
  end if;

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

  if not exists (select 1 from public.message_flow_steps where flow_id = p_flow_id) then
    raise exception 'el flujo % no tiene pasos definidos', p_flow_id;
  end if;

  -- Si ya hay una inscripcion activa del mismo lead y canal, el indice unico
  -- parcial de la 108 revienta el insert aqui. Se deja subir tal cual: es la
  -- señal correcta para que el cliente la traduzca.
  insert into public.message_flow_enrollments (flow_id, user_id, lead_id, channel)
  values (p_flow_id, auth.uid(), p_lead_id, v_channel)
  returning * into v_enrollment;

  v_base := coalesce(p_base, v_enrollment.enrolled_at);

  -- Los pasos que se dan por hechos, con la fecha real del envio.
  insert into public.message_flow_progress (enrollment_id, step_id, user_id, status, due_at, dispatched_at)
  select v_enrollment.id, st.id, auth.uid(), 'registrado', v_base, v_base
  from public.message_flow_steps st
  where st.flow_id = p_flow_id
    and st.step_order <= p_last_done_order;

  get diagnostics v_hechos = row_count;

  -- El siguiente paso pendiente, con su espera contada desde `v_base`.
  select id, wait_days into v_next_step_id, v_next_wait
  from public.message_flow_steps
  where flow_id = p_flow_id
    and step_order > p_last_done_order
  order by step_order asc
  limit 1;

  if v_next_step_id is null then
    -- No queda nada por mandar: se cierra igual que lo haria el trigger de
    -- avance al registrar el ultimo paso. Dejarla activa sin nada pendiente
    -- seria una inscripcion que no vence nunca.
    update public.message_flow_enrollments
    set status = 'completada',
        exited_at = now(),
        exit_reason = 'fin_secuencia',
        updated_at = now()
    where id = v_enrollment.id
    returning * into v_enrollment;
  else
    insert into public.message_flow_progress (enrollment_id, step_id, user_id, status, due_at)
    values (
      v_enrollment.id,
      v_next_step_id,
      auth.uid(),
      'pendiente',
      v_base + make_interval(days => v_next_wait)
    );
  end if;

  return v_enrollment;
end;
$$;

REVOKE ALL ON FUNCTION public.enroll_lead_in_flow_from(uuid, uuid, integer, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.enroll_lead_in_flow_from(uuid, uuid, integer, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.enroll_lead_in_flow_from(uuid, uuid, integer, timestamptz) IS
  'Inscribe un lead en un flujo dando por hechos los pasos hasta p_last_done_order, y deja pendiente el siguiente con la espera contada desde p_base. Con p_last_done_order = 0 equivale a enroll_lead_in_flow.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.enroll_lead_in_flow_from(uuid, uuid, integer, timestamptz);
--   drop function if exists public.flow_resume_points(uuid);
