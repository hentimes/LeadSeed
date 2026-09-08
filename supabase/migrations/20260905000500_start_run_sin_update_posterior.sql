-- Query permanente
-- Dominio: playbooks / arranque de un recorrido
-- Objeto: public.start_my_playbook_run(uuid, uuid, uuid)
-- Clase: correccion de una funcion
-- Descripcion: resuelve los origenes DENTRO del insert, sin update posterior
-- Proposito: que empezar un recorrido no choque con el guard del snapshot
-- Dependencias: 151 (el guard invertido), 153 (la version rota)
-- Impacto: arregla un fallo que impedia empezar cualquier recorrido
-- Persistencia: permanente
-- Reversibilidad: volver a la 153, que no funciona
--
-- ======================================================================
-- EL FALLO
-- ======================================================================
--
-- La 153 resolvia `source_run_item_ids` con un UPDATE justo despues del
-- INSERT. Y `source_run_item_ids` es una columna CONGELADA: la 151 dejo el
-- guard enumerando lo mutable -estado, nota, selecciones, texto del checkpoint
-- y los dos sellos- y todo lo demas protegido.
--
-- Resultado: el guard abortaba la propia RPC con
--
--   "El registro de lo que se pregunto no se edita: solo cambian el estado,
--    la seleccion y las notas"
--
-- y no se podia empezar ningun recorrido.
--
-- Las dos migraciones tenian razon por separado. El error fue escribirlas sin
-- cruzarlas: la 151 se aplico sola -a proposito, para descubrir un fallo de la
-- inversion con cero superficie encima- y la 153 llego despues suponiendo que
-- podia escribir en una columna que la 151 acababa de blindar.
--
-- Vale la pena decirlo claro: **el candado funciono**. Detecto una escritura
-- ilegitima en el snapshot el primer dia, y da la casualidad de que la
-- escribimos nosotros.
--
-- ======================================================================
-- LA CORRECCION
-- ======================================================================
--
-- No se afloja el guard: se deja de necesitar el UPDATE.
--
-- Los ids de los items del recorrido se acuñan por adelantado en un CTE, de
-- modo que dentro del mismo INSERT ya se puede traducir cada `source_item_ids`
-- de la definicion a los ids de este recorrido. Una sola sentencia, sin
-- reescribir nada despues.
--
-- ## `as materialized` no es decorativo
--
-- El CTE se referencia dos veces -una para las filas y otra para resolver los
-- origenes- y contiene `gen_random_uuid()`. Sin materializar, Postgres podria
-- integrarlo y evaluar la funcion otra vez en la segunda referencia: los
-- origenes apuntarian a uuids que no existen. Con `materialized` se calcula una
-- vez y las dos referencias ven los mismos ids.
--
-- Que `gen_random_uuid()` sea VOLATILE ya impide integrarlo en las versiones
-- actuales, pero eso es un detalle del planificador y esto es una garantia de
-- correccion: se escribe.
--
-- ## `get diagnostics` vuelve a ser fiable
--
-- Al no haber sentencia despues del INSERT, `row_count` es otra vez el de las
-- filas insertadas y el corte por "el playbook no tiene preguntas" protege.

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
  -- 062, 098, 100).
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

  with base as materialized (
    select
      gen_random_uuid() as nuevo_id,
      i.id              as item_id,
      i.title,
      i.question,
      i.support,
      i.answer_type,
      i.intent_role,
      i.options,
      i.source_item_ids,
      s.id              as section_id,
      s.title           as section_title,
      s.position        as section_position,
      row_number() over (order by s.position, i.position) as pos
    from public.playbook_items i
    join public.playbook_sections s on s.id = i.section_id
    where s.playbook_id = p_playbook_id
  )
  insert into public.playbook_run_items (
    id, run_id, position,
    title, question, support, section_title, section_position,
    item_id, source_section_id,
    answer_type, intent_role, options, source_run_item_ids
  )
  select
    b.nuevo_id,
    v_run_id,
    b.pos,
    b.title, b.question, b.support, b.section_title, b.section_position,
    b.item_id, b.section_id,
    b.answer_type, b.intent_role, b.options,
    -- Los origenes ya traducidos a ids de ESTE recorrido, sin update posterior.
    coalesce(
      (
        select array_agg(origen.nuevo_id order by origen.pos)
        from base origen
        where origen.item_id = any (b.source_item_ids)
      ),
      '{}'
    )
  from base b;

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
  'Crea un recorrido y vuelca sus items -tipo de respuesta, catalogo de opciones y origenes ya traducidos- en una sola sentencia, sin reescribir despues ninguna columna congelada.';
