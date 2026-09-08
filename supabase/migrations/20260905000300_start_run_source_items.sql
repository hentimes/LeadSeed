-- Query permanente
-- Dominio: playbooks / arranque de un recorrido
-- Objeto: public.start_my_playbook_run(uuid, uuid, uuid)
-- Clase: redefinicion de una funcion existente
-- Descripcion: el snapshot copia el tipo de respuesta y traduce los origenes
-- Proposito: que un recorrido nazca sabiendo que puntos alimentan a cuales
-- Dependencias: 148 (la funcion), 152 (las columnas)
-- Impacto: los recorridos nuevos copian cuatro columnas mas
-- Persistencia: permanente
-- Reversibilidad: total (volver al cuerpo de la 148)
--
-- ======================================================================
-- QUE SE ANADE
-- ======================================================================
--
-- 1. El snapshot copia `answer_type`, `intent_role` y `options`, que son parte
--    de lo que el cliente vio y aprobo, igual que la pregunta.
--
-- 2. Se traducen los `source_item_ids` de la DEFINICION a los ids de los items
--    de ESTE recorrido. Se congela asi la ESTRUCTURA de la dependencia -que
--    punto hereda de cual-, no su contenido: que opciones se ofrecen en cada
--    momento se deriva en vivo de lo que este marcado arriba, y guardarlo
--    seria una tercera copia de la misma verdad.
--
-- ======================================================================
-- EL ORDEN DE `get diagnostics` NO ES COSMETICO
-- ======================================================================
--
-- `get diagnostics ... = row_count` lee **la sentencia inmediatamente
-- anterior**. En la 148 iba justo detras del INSERT de los items, que es lo
-- que hace que el corte por "el playbook no tiene preguntas" funcione.
--
-- Esta migracion mete un UPDATE despues de ese INSERT. Si el `get diagnostics`
-- se quedara donde estaba, pasaria a contar las filas del UPDATE -que puede
-- ser cero perfectamente, porque casi ningun punto tiene origenes- y el corte
-- empezaria a dispararse con playbooks que si tienen preguntas, o peor,
-- dejaria de dispararse con los que no.
--
-- Por eso `v_items` se captura pegado al INSERT y el UPDATE va despues. Es una
-- linea de distancia entre funcionar y romperse en silencio.
--
-- ======================================================================
-- `create or replace` CON LA FIRMA IDENTICA
-- ======================================================================
--
-- Los tres argumentos son exactamente los de la 148. Cambiar la lista crearia
-- una funcion NUEVA y dejaria la vieja viva con su `grant execute` a
-- `authenticated`: un camino de entrada olvidado, que es justo el problema que
-- costo las migraciones 143 y 144.
--
-- REVERSION
--
--   Volver a aplicar el cuerpo de la 148. Los recorridos ya creados conservan
--   lo copiado; solo dejarian de copiarse los nuevos.

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
    item_id, source_section_id,
    answer_type, intent_role, options
  )
  select
    v_run_id,
    row_number() over (order by s.position, i.position),
    i.title, i.question, i.support, s.title, s.position,
    i.id, s.id,
    i.answer_type, i.intent_role, i.options
  from public.playbook_items i
  join public.playbook_sections s on s.id = i.section_id
  where s.playbook_id = p_playbook_id;

  -- PEGADO AL INSERT. Ver la cabecera: `row_count` es el de la sentencia
  -- anterior, y debajo hay ahora un UPDATE que lo pisaria.
  get diagnostics v_items = row_count;

  -- Un playbook sin items no es un recorrido, es una fila vacia que despues
  -- bloquea al lead. Se aborta y no se guarda nada.
  if v_items = 0 then
    raise exception 'El playbook no tiene preguntas todavia';
  end if;

  /*
   * Los origenes, de ids de la definicion a ids de este recorrido.
   *
   * `coalesce(..., '{}')` porque un origen que ya no exista en el playbook
   * -se borro el punto despues de declararlo- debe dar array vacio y no nulo:
   * la columna es `not null` y un punto sin origenes resueltos simplemente no
   * ofrece opciones heredadas, que es degradarse, no romperse.
   */
  update public.playbook_run_items destino
  set source_run_item_ids = coalesce(
    (
      select array_agg(origen.id order by origen.position)
      from public.playbook_run_items origen
      where origen.run_id = v_run_id
        and origen.item_id = any (
          select unnest(definicion.source_item_ids)
          from public.playbook_items definicion
          where definicion.id = destino.item_id
        )
    ),
    '{}'
  )
  where destino.run_id = v_run_id
    and destino.item_id is not null
    and exists (
      select 1 from public.playbook_items definicion
      where definicion.id = destino.item_id
        and cardinality(definicion.source_item_ids) > 0
    );

  return v_run_id;
end;
$$;

comment on function public.start_my_playbook_run(uuid, uuid, uuid) is
  'Crea un recorrido, vuelca sus items -incluido el tipo de respuesta y el catalogo de opciones- y traduce los origenes de la definicion a items de este recorrido, todo en una sola transaccion.';
