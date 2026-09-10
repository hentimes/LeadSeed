-- las_marcas_valen_al_inscribir_en_tanda
--
-- Tipo:           correccion de dos funciones
-- Objeto:         public.enroll_lead_in_flow_from, public.enroll_leads_in_flow
-- Clase:          correccion de un fallo
-- Persistencia:   permanente
-- Reversibilidad: total (reponer las dos desde la 158 y la 160)
--
-- ===========================================================================
-- LA 184 PUSO LA GUARDA EN LA PUERTA QUE CASI NADIE USA
-- ===========================================================================
--
-- `enroll_lead_in_flow` inscribe DE A UNO. La inscripcion en tanda -la de los
-- mil novecientos leads, la unica que se usa de verdad- pasa por
-- `enroll_leads_in_flow`, que llama a `enroll_lead_in_flow_from`, que no
-- comprueba nada.
--
-- Con solo la 184 aplicada: marcar a alguien como "no contactar" impide
-- inscribirlo a mano y no impide que entre en la proxima inscripcion masiva.
-- Que es donde entran todos.
--
-- ===========================================================================
-- Y EL RECUENTO TIENE QUE DECIRLO
-- ===========================================================================
--
-- El bucle de `enroll_leads_in_flow` ya separa "ya estaba en un flujo" de
-- "fallo", porque son cosas distintas y el usuario tiene derecho a saber cual
-- le paso. Un lead marcado es una tercera cosa: no es un fallo -el sistema hizo
-- exactamente lo que se le pidio- y agruparlo con los fallos convierte una
-- decision del usuario en un error de la aplicacion.
--
-- Por eso se levanta con un SQLSTATE propio, `LS001`, en vez de dejar que caiga
-- en el `when others`. Un texto de error no se puede distinguir de otro sin
-- leerlo con una expresion regular, que es justo lo que no hay que hacer dentro
-- de un bucle de quinientas iteraciones.

-- ---------------------------------------------------------------------------
-- 1. LA GUARDA, EN LA FUNCION QUE INSCRIBE DESDE UN PASO
-- ---------------------------------------------------------------------------

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
  v_no_contactar timestamptz;
  v_sin_whatsapp timestamptz;
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

  select do_not_contact_at, no_whatsapp_at
  into v_no_contactar, v_sin_whatsapp
  from public.leads
  where id = p_lead_id
    and user_id = auth.uid()
    and deleted_at is null;

  if not found then
    raise exception 'el lead % no existe o no es tuyo', p_lead_id;
  end if;

  -- LS001: el lead esta marcado. Lo distingue del resto de errores para que el
  -- recuento de la tanda pueda contarlo aparte. Ver la cabecera.
  if v_no_contactar is not null then
    raise exception 'el lead % pidio no recibir mas mensajes', p_lead_id
      using errcode = 'LS001';
  end if;

  if v_channel = 'whatsapp' and v_sin_whatsapp is not null then
    raise exception 'el numero del lead % no esta en WhatsApp', p_lead_id
      using errcode = 'LS001';
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
  'Inscribe un lead dando por hechos los pasos hasta p_last_done_order y programando el siguiente desde p_base. Rechaza con SQLSTATE LS001 al lead que pidio no recibir mas mensajes, y al que no tiene WhatsApp si el flujo es de ese canal.';


-- ---------------------------------------------------------------------------
-- 2. LA TANDA CUENTA LOS MARCADOS APARTE
-- ---------------------------------------------------------------------------
--
-- Una columna mas en el resultado. El cliente que no la lea sigue funcionando
-- igual: las tres que ya leia no cambian de nombre ni de significado.
--
-- Va con DROP y no con CREATE OR REPLACE: agregar una columna cambia el tipo de
-- retorno, y reemplazar no puede cambiarlo. El hueco entre el DROP y el CREATE
-- vive dentro de la transaccion de la migracion, asi que ninguna sesion llega a
-- ver la funcion ausente.

DROP FUNCTION IF EXISTS public.enroll_leads_in_flow(uuid, uuid[], boolean, integer);

CREATE OR REPLACE FUNCTION public.enroll_leads_in_flow(
  p_flow_id uuid,
  p_lead_ids uuid[],
  p_use_detection boolean DEFAULT true,
  p_start_step integer DEFAULT 1
)
RETURNS TABLE (
  inscritos integer,
  ya_en_flujo integer,
  fallidos integer,
  marcados integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_lead uuid;
  v_last integer;
  v_base timestamptz;
  v_ok integer := 0;
  v_ocupados integer := 0;
  v_fallidos integer := 0;
  v_marcados integer := 0;
begin
  if p_lead_ids is null or array_length(p_lead_ids, 1) is null then
    inscritos := 0;
    ya_en_flujo := 0;
    fallidos := 0;
    marcados := 0;
    return next;
    return;
  end if;

  if array_length(p_lead_ids, 1) > 500 then
    raise exception 'no se pueden inscribir mas de 500 leads de una vez';
  end if;

  if not exists (
    select 1 from public.message_flows
    where id = p_flow_id and user_id = auth.uid()
  ) then
    raise exception 'el flujo % no existe o no es tuyo', p_flow_id;
  end if;

  foreach v_lead in array p_lead_ids loop
    if p_use_detection then
      -- El paso mas avanzado cuya plantilla consta enviada, y la fecha de ese
      -- envio. Misma regla que `flow_resume_points`.
      select st.step_order, s.sent_at
        into v_last, v_base
      from public.send_logs s
      join public.message_flow_steps st
        ON st.template_id = s.template_id
       AND st.flow_id = p_flow_id
      where s.lead_id = v_lead
      order by st.step_order desc, s.sent_at desc
      limit 1;

      v_last := coalesce(v_last, 0);
    else
      v_last := greatest(coalesce(p_start_step, 1) - 1, 0);
      v_base := null;
    end if;

    begin
      perform public.enroll_lead_in_flow_from(p_flow_id, v_lead, v_last, v_base);
      v_ok := v_ok + 1;
    exception
      when unique_violation then
        -- Ya tiene una inscripcion activa de este canal. Es un dato, no un
        -- fallo: se cuenta aparte para poder decirlo.
        v_ocupados := v_ocupados + 1;
      when sqlstate 'LS001' then
        -- Pidio no recibir mas mensajes, o su numero no esta en WhatsApp.
        -- Tampoco es un fallo: es la marca haciendo su trabajo.
        v_marcados := v_marcados + 1;
      when others then
        v_fallidos := v_fallidos + 1;
    end;
  end loop;

  inscritos := v_ok;
  ya_en_flujo := v_ocupados;
  fallidos := v_fallidos;
  marcados := v_marcados;
  return next;
end;
$$;

REVOKE ALL ON FUNCTION public.enroll_leads_in_flow(uuid, uuid[], boolean, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.enroll_leads_in_flow(uuid, uuid[], boolean, integer) TO authenticated;

COMMENT ON FUNCTION public.enroll_leads_in_flow(uuid, uuid[], boolean, integer) IS
  'Inscribe varios leads en un flujo de una vez, cada uno desde el paso que ya recibio si p_use_detection. Cada lead falla por su cuenta; devuelve las cuentas de inscritos, ya inscritos en el canal, marcados como sin contactar o sin WhatsApp, y fallidos.';


NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Reponer `enroll_lead_in_flow_from` desde la 158 y `enroll_leads_in_flow`
--   desde la 160, las dos con CREATE OR REPLACE.
--
--   Cambiar el numero de columnas devueltas obliga a DROP antes del CREATE:
--   `CREATE OR REPLACE` no puede quitar una columna del tipo de retorno.
