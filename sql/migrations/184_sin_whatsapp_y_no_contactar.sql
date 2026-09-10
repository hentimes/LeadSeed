-- sin_whatsapp_y_no_contactar
--
-- Tipo:           columnas nuevas + RPCs + correccion de una funcion
-- Objeto:         public.leads, public.message_flow_enrollments,
--                 public.lead_lists, public.enroll_lead_in_flow,
--                 public.lead_send_summary
-- Clase:          capacidad nueva + correccion de un fallo
-- Persistencia:   permanente
-- Reversibilidad: parcial (ver al final)
--
-- ===========================================================================
-- DOS FORMAS DE SALIR QUE HOY NO EXISTEN, Y UN NUMERO QUE MIENTE
-- ===========================================================================
--
-- ## 1. El numero que no esta en WhatsApp
--
-- La cola guiada abre el chat y registra el envio en cuanto lo abre. Es lo
-- correcto -ver `useWhatsAppQueue`- salvo en un caso: cuando WhatsApp Web
-- responde "el numero +56 9 XXXX XXXX no esta en WhatsApp".
--
-- Ahi el registro ya se escribio. Ese contacto:
--
--   * suma en el historial del lead,
--   * gasta cupo del tope diario,
--   * cuenta en el panel como mensaje enviado,
--   * y marca el paso del flujo como registrado, con lo que el trigger de la
--     109 programa el paso siguiente. Dentro de tres dias vuelve a tocar el
--     mismo numero, que sigue sin tener WhatsApp.
--
-- No hay forma de detectarlo desde la aplicacion: WhatsApp Web avisa en un
-- dialogo suyo, dentro de una pestaña que no es nuestra. La unica que sabe es
-- la persona que esta mirando. Lo que faltaba era donde decirlo.
--
-- ## 2. El que pidio no recibir mas mensajes
--
-- `exit_reason` tiene seis motivos y ninguno es este. El mas cercano es
-- `manual`, que no distingue "lo saque yo porque ya no aplica" de "me pidio
-- que no le escriba mas". La diferencia importa: al primero se le puede
-- volver a escribir.
--
-- Y no hay donde anotar el detalle. "Me dijo que le escriba en marzo" y "se
-- enojo" terminan los dos como `manual`, y en tres meses no hay forma de
-- saber cual era cual.
--
-- ## 3. Lo que se conserva
--
-- Salir de un flujo NO borra el progreso. Las filas de `message_flow_progress`
-- se quedan tal cual, asi que hasta donde llego cada uno sigue estando: que
-- pasos recibio, cuando, y con que plantilla. Esta migracion no agrega eso
-- porque ya estaba; lo que agrega es el motivo y la nota que le dan sentido.
--
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. LOS DOS MOTIVOS NUEVOS Y LA NOTA
-- ---------------------------------------------------------------------------
--
-- Ampliar un CHECK es seguro: toda fila que cumplia la lista vieja cumple la
-- nueva, que es la misma mas dos valores.

ALTER TABLE public.message_flow_enrollments
  DROP CONSTRAINT IF EXISTS message_flow_enrollments_exit_reason_check;

ALTER TABLE public.message_flow_enrollments
  ADD CONSTRAINT message_flow_enrollments_exit_reason_check
  CHECK (exit_reason IS NULL OR exit_reason IN (
    'convertido', 'descartado', 'fin_secuencia', 'respondio', 'manual', 'otro_flujo',
    'sin_whatsapp', 'no_contactar'
  ));

ALTER TABLE public.message_flow_enrollments
  ADD COLUMN IF NOT EXISTS exit_note text;

-- Cincuenta caracteres es lo que pidio el usuario y es la medida correcta: da
-- para "pidio que lo llame en marzo" y no para un campo de notas paralelo al
-- que ya tiene el lead.
ALTER TABLE public.message_flow_enrollments
  DROP CONSTRAINT IF EXISTS message_flow_enrollments_exit_note_length;

ALTER TABLE public.message_flow_enrollments
  ADD CONSTRAINT message_flow_enrollments_exit_note_length
  CHECK (exit_note IS NULL OR char_length(exit_note) <= 50);

COMMENT ON COLUMN public.message_flow_enrollments.exit_note IS
  'Detalle libre de la salida, hasta 50 caracteres. Va con la salida y no con el lead: el mismo lead puede salir de dos flujos por motivos distintos.';


-- ---------------------------------------------------------------------------
-- 2. LAS MARCAS EN EL LEAD
-- ---------------------------------------------------------------------------
--
-- Son fechas y no booleanos: nulo significa "no marcado" y con valor dice
-- ademas cuando se marco, que es lo primero que se pregunta despues. Un
-- booleano obligaria a una segunda columna para lo mismo.
--
-- POR QUE VAN EN EL LEAD Y NO SOLO EN LA SALIDA
--
-- "No tiene WhatsApp" y "no quiere que le escriban" son cosas de la persona,
-- no de un flujo. Si vivieran solo en la inscripcion, sacarlo del flujo A no
-- impediria meterlo manana en el flujo B, que es exactamente el problema que
-- se viene a resolver. El punto 5 las hace valer en la inscripcion.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS no_whatsapp_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS do_not_contact_at timestamptz;

COMMENT ON COLUMN public.leads.no_whatsapp_at IS
  'Cuando se marco que este numero no esta en WhatsApp. Con valor, el lead no entra a flujos de WhatsApp. No lo detecta el sistema: lo marca quien vio el aviso de WhatsApp Web.';

COMMENT ON COLUMN public.leads.do_not_contact_at IS
  'Cuando el lead pidio no recibir mas mensajes. Con valor, no entra a ningun flujo de ningun canal. El motivo escrito queda en message_flow_enrollments.exit_note de la salida que lo marco.';

-- Indices parciales: los marcados son la minoria y son justo los que se
-- buscan. Sobre el resto no hay consulta que los pida.
CREATE INDEX IF NOT EXISTS leads_no_whatsapp_idx
  ON public.leads (user_id, no_whatsapp_at)
  WHERE no_whatsapp_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_do_not_contact_idx
  ON public.leads (user_id, do_not_contact_at)
  WHERE do_not_contact_at IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 3. LAS DOS LISTAS
-- ---------------------------------------------------------------------------
--
-- La marca del punto 2 es la verdad. La lista es la VISTA: es donde el usuario
-- ya sabe mirar, filtrar y exportar sus contactos, y pedirle que aprenda una
-- pantalla nueva para ver dos grupos no tiene sentido.
--
-- Son dos representaciones de lo mismo y eso hay que decirlo en voz alta:
-- quitar un lead de la lista NO le quita la marca. La lista se puede reordenar,
-- renombrar y vaciar sin romper nada, porque quien decide si el lead entra a un
-- flujo es la columna, no la pertenencia a la lista.
--
-- Se busca por nombre y no por un identificador fijo porque `lead_lists` no
-- tiene columna de sistema, y agregarsela para esto seria pedirle a la tabla
-- que sepa de flujos.

CREATE OR REPLACE FUNCTION public.asegurar_lista_de_leads(
  p_nombre text,
  p_descripcion text DEFAULT NULL,
  p_color text DEFAULT '#64748b'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  v_id bigint;
begin
  select id into v_id
  from public.lead_lists
  where user_id = auth.uid()
    and lower(btrim(name)) = lower(btrim(p_nombre))
  order by id asc
  limit 1;

  if v_id is null then
    insert into public.lead_lists (user_id, name, color, description)
    values (auth.uid(), p_nombre, p_color, p_descripcion)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

REVOKE ALL ON FUNCTION public.asegurar_lista_de_leads(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.asegurar_lista_de_leads(text, text, text) TO authenticated;

COMMENT ON FUNCTION public.asegurar_lista_de_leads(text, text, text) IS
  'Devuelve el id de la lista propia con ese nombre, creandola si no existe. Compara sin distinguir mayusculas ni espacios de los bordes. Respeta RLS por SECURITY INVOKER.';


-- Mete un lead en una lista sin sacarlo de las que ya tenia.
--
-- `lista_ids` es un arreglo en la fila del lead, asi que agregar es leer,
-- comprobar y reescribir. Se hace en la base y no en el cliente para que dos
-- salidas seguidas no se pisen el arreglo entre la lectura y la escritura.
CREATE OR REPLACE FUNCTION public.agregar_lead_a_lista(
  p_lead_id uuid,
  p_lista_id bigint
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  update public.leads
  set lista_ids = array_append(coalesce(lista_ids, '{}'::integer[]), p_lista_id::integer),
      updated_at = now()
  where id = p_lead_id
    and not (coalesce(lista_ids, '{}'::integer[]) @> array[p_lista_id::integer]);
$$;

REVOKE ALL ON FUNCTION public.agregar_lead_a_lista(uuid, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.agregar_lead_a_lista(uuid, bigint) TO authenticated;

COMMENT ON FUNCTION public.agregar_lead_a_lista(uuid, bigint) IS
  'Agrega el lead a una lista conservando las que ya tenia. No hace nada si ya estaba. Respeta RLS por SECURITY INVOKER.';


-- ---------------------------------------------------------------------------
-- 4. SALIR DE UN FLUJO, CON MOTIVO Y NOTA
-- ---------------------------------------------------------------------------
--
-- Una sola funcion para las dos salidas nuevas y para las viejas. Es una
-- transaccion porque las cuatro escrituras -cerrar la inscripcion, omitir lo
-- pendiente, marcar al lead y meterlo en la lista- no tienen sentido a medias:
-- un lead marcado cuya inscripcion sigue activa seguiria recibiendo mensajes.
--
-- LO QUE NO HACE: no toca `message_flow_progress` de los pasos ya registrados.
-- Ese es justamente el rastro que el usuario pidio conservar -"registrar hasta
-- donde llegaron"- y borrarlo para limpiar la salida seria el peor
-- intercambio posible.
--
-- ALCANCE DE CADA MOTIVO
--
--   no_contactar  cierra TODAS las inscripciones activas del lead, de todos
--                 los canales. Quien pide no recibir mas mensajes no lo pide
--                 por WhatsApp y si por correo.
--
--   sin_whatsapp  cierra solo las de WhatsApp. Que el numero no tenga la
--                 aplicacion no dice nada sobre su correo.
--
--   el resto      cierra solo la inscripcion indicada, como hasta ahora.

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
  v_lista bigint;
begin
  if p_motivo not in (
    'convertido', 'descartado', 'fin_secuencia', 'respondio', 'manual',
    'otro_flujo', 'sin_whatsapp', 'no_contactar'
  ) then
    raise exception 'motivo de salida desconocido: %', p_motivo;
  end if;

  -- Vacio y nulo son lo mismo aqui: un campo que se dejo sin llenar. Guardar
  -- la cadena vacia obligaria a todo lector a comprobar las dos cosas.
  v_nota := nullif(btrim(coalesce(p_nota, '')), '');
  if v_nota is not null then
    v_nota := left(v_nota, 50);
  end if;

  -- La RLS de `message_flow_enrollments` acota el update a las propias, asi
  -- que si no hay fila es que no existe o no es de quien llama.
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

  -- Lo que quedaba por mandar se omite. Sin esto las filas siguen en
  -- `pendiente`, y aunque la cola del dia las filtra por el estado de la
  -- inscripcion, quedarian ahi para siempre diciendo que tocan.
  update public.message_flow_progress
  set status = 'omitido',
      updated_at = now()
  where enrollment_id = p_enrollment_id
    and status in ('pendiente', 'toca');

  if p_motivo = 'no_contactar' then
    update public.leads
    set do_not_contact_at = coalesce(do_not_contact_at, now()),
        updated_at = now()
    where id = v_lead_id;

    -- Todas las demas inscripciones activas del lead, de cualquier canal.
    with cerradas as (
      update public.message_flow_enrollments
      set status = 'salida',
          exited_at = now(),
          exit_reason = 'no_contactar',
          exit_note = v_nota,
          updated_at = now()
      where lead_id = v_lead_id
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
    perform public.agregar_lead_a_lista(v_lead_id, v_lista);
  end if;

  if p_motivo = 'sin_whatsapp' then
    update public.leads
    set no_whatsapp_at = coalesce(no_whatsapp_at, now()),
        updated_at = now()
    where id = v_lead_id;

    with cerradas as (
      update public.message_flow_enrollments
      set status = 'salida',
          exited_at = now(),
          exit_reason = 'sin_whatsapp',
          exit_note = v_nota,
          updated_at = now()
      where lead_id = v_lead_id
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
    perform public.agregar_lead_a_lista(v_lead_id, v_lista);
  end if;
end;
$$;

REVOKE ALL ON FUNCTION public.salir_del_flujo(bigint, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.salir_del_flujo(bigint, text, text) TO authenticated;

COMMENT ON FUNCTION public.salir_del_flujo(bigint, text, text) IS
  'Cierra una inscripcion con motivo y nota, omite lo que quedaba pendiente y conserva el progreso ya registrado. Con no_contactar marca al lead y cierra todos sus flujos; con sin_whatsapp solo los de WhatsApp. Respeta RLS por SECURITY INVOKER.';


-- ---------------------------------------------------------------------------
-- 5. DESHACER EL ENVIO QUE NUNCA LLEGO
-- ---------------------------------------------------------------------------
--
-- Esta es la que se llama desde la cola guiada, y hace algo que la anterior no
-- puede: DESHACER el registro que se escribio al abrir el chat.
--
-- Tres cosas hay que revertir, y ninguna es opcional:
--
--   1. El registro de envio. Se marca `deleted_at`, que es como el proyecto
--      quita algo de las cuentas sin destruir el rastro contable (migracion
--      135). Con eso deja de sumar en el cupo del dia, en el panel y en el
--      historial del lead.
--
--   2. El paso, que quedo `registrado`. Pasa a `omitido`, que es la verdad:
--      no se mando, se salteo.
--
--   3. EL PASO SIGUIENTE, que el trigger de la 109 creo en el mismo instante
--      en que el paso se marco como registrado. Si no se borra, en tres dias
--      la cola vuelve a ofrecer el mismo numero que no tiene WhatsApp. Solo se
--      borra si sigue intacto -pendiente o toca, sin despachar-: si alguien ya
--      lo mando, no es nuestro para borrarlo.
--
-- LO QUE NO REVIERTE, A PROPOSITO
--
-- El estado del lead. Al registrar el envio se le puso `contactado`, y aqui no
-- se le devuelve el que tenia porque no lo sabemos: la escritura anterior no
-- guardo cual era. Y tampoco es mentira: alguien intento contactarlo.

CREATE OR REPLACE FUNCTION public.marcar_paso_sin_whatsapp(
  p_progress_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  v_enrollment_id bigint;
  v_send_log_id bigint;
  v_step_order integer;
  v_flow_id uuid;
begin
  select p.enrollment_id, p.send_log_id, s.step_order, s.flow_id
  into v_enrollment_id, v_send_log_id, v_step_order, v_flow_id
  from public.message_flow_progress p
  join public.message_flow_steps s on s.id = p.step_id
  where p.id = p_progress_id;

  if v_enrollment_id is null then
    raise exception 'el paso % no existe o no es tuyo', p_progress_id;
  end if;

  -- 1. El envio deja de contar.
  if v_send_log_id is not null then
    update public.send_logs
    set deleted_at = now()
    where id = v_send_log_id
      and deleted_at is null;
  end if;

  -- 3. El paso siguiente, antes de tocar este: en cuanto este deje de estar en
  -- `registrado` la busqueda por orden sigue valiendo, pero hacerlo primero
  -- evita depender de eso.
  delete from public.message_flow_progress p
  using public.message_flow_steps s
  where p.step_id = s.id
    and p.enrollment_id = v_enrollment_id
    and s.flow_id = v_flow_id
    and s.step_order > v_step_order
    and p.status in ('pendiente', 'toca')
    and p.dispatched_at is null;

  -- 2. El paso no se mando: se salteo.
  update public.message_flow_progress
  set status = 'omitido',
      send_log_id = null,
      dispatched_at = null,
      updated_at = now()
  where id = p_progress_id;

  /*
   * SI ERA EL ULTIMO PASO, la inscripcion ya no esta activa.
   *
   * El mismo trigger de la 109 que programa el paso siguiente cierra la
   * inscripcion como `completada` cuando no hay siguiente. Sin esto,
   * `salir_del_flujo` no encontraria ninguna inscripcion activa y fallaria
   * justo en el ultimo mensaje de la secuencia, que es cuando mas se nota.
   *
   * Se reabre solo si la cerro esa via -`fin_secuencia`-: una inscripcion que
   * alguien cerro por otro motivo no es nuestra para reabrirla.
   */
  update public.message_flow_enrollments
  set status = 'activa',
      exited_at = null,
      exit_reason = null,
      updated_at = now()
  where id = v_enrollment_id
    and status = 'completada'
    and exit_reason = 'fin_secuencia';

  -- Y la salida completa, con su marca y su lista.
  perform public.salir_del_flujo(v_enrollment_id, 'sin_whatsapp', null);
end;
$$;

REVOKE ALL ON FUNCTION public.marcar_paso_sin_whatsapp(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.marcar_paso_sin_whatsapp(bigint) TO authenticated;

COMMENT ON FUNCTION public.marcar_paso_sin_whatsapp(bigint) IS
  'Deshace el envio que se registro al abrir un chat de un numero que no tiene WhatsApp: borra el registro en blando, omite el paso, elimina el siguiente que el trigger habia programado y saca al lead del flujo marcandolo. Respeta RLS por SECURITY INVOKER.';


-- ---------------------------------------------------------------------------
-- 6. LAS MARCAS VALEN AL INSCRIBIR
-- ---------------------------------------------------------------------------
--
-- Sin esto, todo lo anterior dura hasta la proxima inscripcion masiva. Es el
-- unico punto por el que un lead entra a un flujo, asi que es el unico sitio
-- donde hay que comprobarlo.
--
-- Se levanta una excepcion y no se ignora en silencio: inscribir a cien leads
-- y que dos no entren sin decirlo es como no haberlos marcado. El cliente ya
-- traduce el error del indice unico y traduce estos igual.

CREATE OR REPLACE FUNCTION public.enroll_lead_in_flow(
  p_flow_id uuid,
  p_lead_id uuid
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
  v_first_step_id bigint;
  v_first_wait integer;
  v_no_contactar timestamptz;
  v_sin_whatsapp timestamptz;
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

  select do_not_contact_at, no_whatsapp_at
  into v_no_contactar, v_sin_whatsapp
  from public.leads
  where id = p_lead_id
    and user_id = auth.uid()
    and deleted_at is null;

  if not found then
    raise exception 'el lead % no existe o no es tuyo', p_lead_id;
  end if;

  if v_no_contactar is not null then
    raise exception 'no_contactar: el lead % pidio no recibir mas mensajes', p_lead_id;
  end if;

  if v_channel = 'whatsapp' and v_sin_whatsapp is not null then
    raise exception 'sin_whatsapp: el numero del lead % no esta en WhatsApp', p_lead_id;
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
  -- parcial de la 108 revienta el insert aqui. Se deja subir tal cual: es la
  -- señal correcta para que el cliente la traduzca.
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

REVOKE ALL ON FUNCTION public.enroll_lead_in_flow(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.enroll_lead_in_flow(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.enroll_lead_in_flow(uuid, uuid) IS
  'Inscribe un lead propio en un flujo propio y crea la fila de progreso del primer paso, en una sola transaccion implicita. Falla si el flujo esta inactivo, no tiene pasos, el lead ya tiene una inscripcion activa del mismo canal, pidio no recibir mas mensajes, o su numero no esta en WhatsApp y el flujo es de ese canal.';


-- ---------------------------------------------------------------------------
-- 7. EL RESUMEN POR LEAD TAMBIEN DEJA DE CONTAR LO BORRADO
-- ---------------------------------------------------------------------------
--
-- Un fallo que ya estaba y que esta migracion vuelve visible.
--
-- `lead_send_summary` cuenta todo `send_logs` sin mirar `deleted_at`, aunque
-- la 135 introdujo el borrado blando y el panel (177) y el historial ya lo
-- excluyen. Marcar un contacto como "sin WhatsApp" deja de sumar en todos
-- lados MENOS en la ficha del propio lead, que es donde primero se mira.
--
-- Lo mismo pasaba desde la 135 con cualquier envio borrado a mano: el
-- historial dejaba de mostrarlo y el contador del lead lo seguia contando.

CREATE OR REPLACE FUNCTION public.lead_send_summary()
RETURNS TABLE (
  lead_id uuid,
  total integer,
  last_sent_at timestamptz,
  last_template_id uuid,
  last_template_name text,
  last_template_type text,
  template_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ultimo AS (
    SELECT DISTINCT ON (s.lead_id)
      s.lead_id AS l_id,
      s.sent_at,
      s.template_id,
      s.template_name,
      s.template_type
    FROM public.send_logs s
    WHERE s.lead_id IS NOT NULL
      AND s.deleted_at IS NULL
    ORDER BY s.lead_id, s.sent_at DESC
  ),
  agregado AS (
    SELECT
      s.lead_id AS l_id,
      count(*)::int AS n,
      -- `coalesce(id, id_por_nombre)`: si el envio conserva su vinculo se usa
      -- ese, y si lo perdio al borrarse la plantilla se recupera por el nombre
      -- guardado. `array_remove(..., NULL)` sigue quitando los que no se pueden
      -- resolver por ninguna de las dos vias -un envio manual sin plantilla-.
      array_remove(array_agg(DISTINCT coalesce(s.template_id, viva.id)), NULL) AS ids
    FROM public.send_logs s
    LEFT JOIN public.templates viva
      ON s.template_id IS NULL
     AND s.template_name IS NOT NULL
     AND viva.user_id = s.user_id
     AND viva.name = s.template_name
     AND viva.type = s.template_type
    WHERE s.lead_id IS NOT NULL
      AND s.deleted_at IS NULL
    GROUP BY s.lead_id
  )
  SELECT
    u.l_id,
    a.n,
    u.sent_at,
    u.template_id,
    u.template_name,
    u.template_type,
    a.ids
  FROM ultimo u
  JOIN agregado a ON a.l_id = u.l_id;
$$;

COMMENT ON FUNCTION public.lead_send_summary() IS
  'Un resumen por lead de lo que se le envio: cuantos mensajes, cuando fue el ultimo, con que plantilla y que plantillas recibio en total. No cuenta los envios borrados. Los envios cuya plantilla se borro se resuelven por el nombre guardado. Respeta RLS por SECURITY INVOKER.';


NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.marcar_paso_sin_whatsapp(bigint);
--   drop function if exists public.salir_del_flujo(bigint, text, text);
--   drop function if exists public.agregar_lead_a_lista(uuid, bigint);
--   drop function if exists public.asegurar_lista_de_leads(text, text, text);
--   alter table public.message_flow_enrollments drop column if exists exit_note;
--   alter table public.leads drop column if exists no_whatsapp_at;
--   alter table public.leads drop column if exists do_not_contact_at;
--
--   `enroll_lead_in_flow` hay que reponerlo desde la 109 y `lead_send_summary`
--   desde la 164, las dos con CREATE OR REPLACE.
--
--   ADVERTENCIA: antes de estrechar el CHECK de `exit_reason` hay que decidir
--   que se hace con las salidas que ya usen los dos motivos nuevos. Volver a la
--   lista de seis con filas escritas las deja violando la restriccion y el
--   ALTER falla.
--
--   Las dos listas "Sin WhatsApp" y "No contactar" NO se borran solas: son
--   listas del usuario como cualquier otra, y a esa altura pueden tener leads
--   metidos a mano.
