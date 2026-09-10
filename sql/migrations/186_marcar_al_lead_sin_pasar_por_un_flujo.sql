-- marcar_al_lead_sin_pasar_por_un_flujo
--
-- Tipo:           RPCs nuevos + refactor de uno existente
-- Objeto:         public.marcar_lead_sin_whatsapp, public.marcar_lead_no_contactar,
--                 public.salir_del_flujo
-- Clase:          correccion de un alcance mal elegido
-- Persistencia:   permanente
-- Reversibilidad: total (ver al final)
--
-- ===========================================================================
-- LAS MARCAS ESTABAN ATADAS A UNA INSCRIPCION QUE NO SIEMPRE EXISTE
-- ===========================================================================
--
-- La 184 puso las dos salidas donde se descubren: con el chat abierto delante.
-- Pero las colgo de `salir_del_flujo`, que necesita una inscripcion, y por eso
-- solo funcionaban en la pantalla de Flujos.
--
-- La ronda de verdad no se hace ahi. Se hace en **Enviar**: se elige una
-- plantilla, se marcan cuarenta y siete destinatarios y se abre la cola. Ahi un
-- destinatario es solo un lead -no hay paso, no hay flujo, no hay inscripcion-
-- y las dos cosas que hay que poder marcar son exactamente las mismas.
--
-- El error fue de alcance: "este numero no esta en WhatsApp" y "esta persona no
-- quiere que le escriba" son hechos sobre el LEAD. Que ademas cierren sus
-- flujos es una consecuencia, no la definicion.
--
-- ===========================================================================
-- QUE CAMBIA
-- ===========================================================================
--
-- Las dos marcas pasan a ser funciones sobre el lead, y `salir_del_flujo` las
-- llama en vez de repetirlas. Un solo sitio decide que significa cada marca, y
-- las dos pantallas hacen lo mismo por construccion.

-- ---------------------------------------------------------------------------
-- 1. EL NUMERO NO ESTA EN WHATSAPP
-- ---------------------------------------------------------------------------
--
-- `p_send_log_id` es opcional porque el registro que hay que deshacer depende
-- de por donde se llame:
--
--   Desde Flujos, lo trae la fila de progreso (`send_log_id`).
--   Desde Enviar, lo trae el registro que la cola acaba de escribir.
--   Desde la ficha de un lead -si algun dia se marca desde ahi- no hay
--   ninguno que deshacer, y entonces va nulo.
--
-- No se busca "el ultimo envio de este lead" por si acaso: seria adivinar cual
-- deshacer, y equivocarse borraria un envio que si ocurrio. El que llama sabe
-- cual es o sabe que no hay.

CREATE OR REPLACE FUNCTION public.marcar_lead_sin_whatsapp(
  p_lead_id uuid,
  p_send_log_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  v_lista bigint;
begin
  -- La RLS acota el update a los leads propios: sin fila, o no existe o no es
  -- de quien llama.
  update public.leads
  set no_whatsapp_at = coalesce(no_whatsapp_at, now()),
      updated_at = now()
  where id = p_lead_id;

  if not found then
    raise exception 'el lead % no existe o no es tuyo', p_lead_id;
  end if;

  -- El envio deja de contar en el cupo, en el panel y en la ficha del lead.
  -- Se marca `deleted_at`, que es como el proyecto quita algo de las cuentas
  -- sin destruir el rastro contable (migracion 135).
  if p_send_log_id is not null then
    update public.send_logs
    set deleted_at = now()
    where id = p_send_log_id
      and deleted_at is null;
  end if;

  -- Sus flujos de WhatsApp se cierran. El correo y las llamadas no se tocan:
  -- que no tenga la aplicacion no dice nada sobre su casilla.
  with cerradas as (
    update public.message_flow_enrollments
    set status = 'salida',
        exited_at = now(),
        exit_reason = 'sin_whatsapp',
        updated_at = now()
    where lead_id = p_lead_id
      and status = 'activa'
      and channel = 'whatsapp'
    returning id
  )
  update public.message_flow_progress p
  set status = 'omitido',
      updated_at = now()
  from cerradas c
  where p.enrollment_id = c.id
    and p.status in ('pendiente', 'toca');

  v_lista := public.asegurar_lista_de_leads('Sin WhatsApp', 'Su número no está en WhatsApp', '#f59e0b');
  perform public.agregar_lead_a_lista(p_lead_id, v_lista);
end;
$$;

REVOKE ALL ON FUNCTION public.marcar_lead_sin_whatsapp(uuid, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.marcar_lead_sin_whatsapp(uuid, bigint) TO authenticated;

COMMENT ON FUNCTION public.marcar_lead_sin_whatsapp(uuid, bigint) IS
  'Marca que el numero del lead no esta en WhatsApp: lo saca de sus flujos de ese canal, lo pone en la lista Sin WhatsApp y, si se le pasa un registro de envio, lo borra en blando para que deje de contar. Respeta RLS por SECURITY INVOKER.';


-- ---------------------------------------------------------------------------
-- 2. PIDIO NO RECIBIR MAS MENSAJES
-- ---------------------------------------------------------------------------
--
-- Aqui NO se deshace ningun envio, y es a proposito: el mensaje si salio. Es
-- justamente el que provoco la respuesta. Borrarlo dejaria una peticion de no
-- contactar sin el mensaje que la origino.

CREATE OR REPLACE FUNCTION public.marcar_lead_no_contactar(
  p_lead_id uuid,
  p_nota text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  v_nota text;
  v_lista bigint;
begin
  -- Vacio y nulo son lo mismo: un campo que se dejo sin llenar. Guardar la
  -- cadena vacia obligaria a todo lector a comprobar las dos cosas.
  v_nota := left(nullif(btrim(coalesce(p_nota, '')), ''), 50);

  update public.leads
  set do_not_contact_at = coalesce(do_not_contact_at, now()),
      updated_at = now()
  where id = p_lead_id;

  if not found then
    raise exception 'el lead % no existe o no es tuyo', p_lead_id;
  end if;

  -- Todos sus flujos, de todos los canales. Quien pide no recibir mas mensajes
  -- no lo pide por WhatsApp y si por correo.
  with cerradas as (
    update public.message_flow_enrollments
    set status = 'salida',
        exited_at = now(),
        exit_reason = 'no_contactar',
        exit_note = v_nota,
        updated_at = now()
    where lead_id = p_lead_id
      and status = 'activa'
    returning id
  )
  update public.message_flow_progress p
  set status = 'omitido',
      updated_at = now()
  from cerradas c
  where p.enrollment_id = c.id
    and p.status in ('pendiente', 'toca');

  v_lista := public.asegurar_lista_de_leads('No contactar', 'Pidieron no recibir más', '#dc2626');
  perform public.agregar_lead_a_lista(p_lead_id, v_lista);
end;
$$;

REVOKE ALL ON FUNCTION public.marcar_lead_no_contactar(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.marcar_lead_no_contactar(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.marcar_lead_no_contactar(uuid, text) IS
  'Marca que el lead pidio no recibir mas mensajes: lo saca de todos sus flujos con la nota, lo pone en la lista No contactar y le cierra la puerta a futuras inscripciones. No borra ningun envio: el mensaje que provoco la respuesta si salio. Respeta RLS por SECURITY INVOKER.';


-- ---------------------------------------------------------------------------
-- 3. SALIR DEL FLUJO DELEGA EN LAS DOS ANTERIORES
-- ---------------------------------------------------------------------------
--
-- Mismo comportamiento que en la 184, sin la copia. Lo que significa cada marca
-- se decide en un solo sitio, y asi las dos pantallas no pueden divergir.

CREATE OR REPLACE FUNCTION public.salir_del_flujo(
  p_enrollment_id bigint,
  p_motivo text,
  p_nota text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  v_lead_id uuid;
  v_nota text;
begin
  if p_motivo not in (
    'convertido', 'descartado', 'fin_secuencia', 'respondio', 'manual',
    'otro_flujo', 'sin_whatsapp', 'no_contactar'
  ) then
    raise exception 'motivo de salida desconocido: %', p_motivo;
  end if;

  v_nota := left(nullif(btrim(coalesce(p_nota, '')), ''), 50);

  update public.message_flow_enrollments
  set status = 'salida',
      exited_at = now(),
      exit_reason = p_motivo,
      exit_note = v_nota,
      updated_at = now()
  where id = p_enrollment_id
    and status = 'activa'
  returning lead_id into v_lead_id;

  if v_lead_id is null then
    raise exception 'la inscripcion % no existe, no es tuya o ya estaba cerrada', p_enrollment_id;
  end if;

  -- Lo que quedaba por mandar de ESTA inscripcion. Las demas las cierran las
  -- funciones de marca, cuando el motivo lo pide.
  update public.message_flow_progress
  set status = 'omitido',
      updated_at = now()
  where enrollment_id = p_enrollment_id
    and status in ('pendiente', 'toca');

  -- El envio no se deshace aqui: cuando hay que deshacerlo, quien llama es
  -- `marcar_paso_sin_whatsapp`, que ya lo hizo antes de llegar hasta aca.
  if p_motivo = 'sin_whatsapp' then
    perform public.marcar_lead_sin_whatsapp(v_lead_id, null);
  elsif p_motivo = 'no_contactar' then
    perform public.marcar_lead_no_contactar(v_lead_id, v_nota);
  end if;
end;
$$;

REVOKE ALL ON FUNCTION public.salir_del_flujo(bigint, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.salir_del_flujo(bigint, text, text) TO authenticated;

COMMENT ON FUNCTION public.salir_del_flujo(bigint, text, text) IS
  'Cierra una inscripcion con motivo y nota, omite lo que quedaba pendiente y conserva el progreso ya registrado. Con sin_whatsapp o no_contactar delega la marca del lead en marcar_lead_sin_whatsapp o marcar_lead_no_contactar. Respeta RLS por SECURITY INVOKER.';


NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.marcar_lead_sin_whatsapp(uuid, bigint);
--   drop function if exists public.marcar_lead_no_contactar(uuid, text);
--
--   Y reponer `salir_del_flujo` desde la 184 con CREATE OR REPLACE, que trae la
--   version que hace el trabajo ella misma.
--
--   ADVERTENCIA: revertir esto deja la pantalla de Enviar llamando a funciones
--   que ya no existen. Hay que revertir tambien el cliente.
