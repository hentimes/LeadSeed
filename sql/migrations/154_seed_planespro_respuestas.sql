-- Query de un solo uso
-- Dominio: playbooks / contenido
-- Objeto: cuatro filas de public.playbook_items del guion "Asesoria PlanesPro"
-- Clase: carga de datos
-- Descripcion: sube los puntos 5, 7, 14 y 16 de texto libre a respuestas por opciones
-- Proposito: que de esos cuatro salga sola la frase de confirmacion
-- Dependencias: 150 (el guion sembrado), 152 (las columnas), 153 (la RPC)
-- Impacto: solo esas cuatro filas, y solo de una cuenta
-- Persistencia: un solo uso
-- Reversibilidad: total (devolverlos a answer_type='texto' y vaciar las columnas)
--
-- ======================================================================
-- SOLO CUATRO DE LOS DIECISIETE
-- ======================================================================
--
-- Los otros trece siguen siendo texto libre, y no por ahorrar trabajo: no son
-- selecciones, son relatos. "Que te llevo a revisar tu plan ahora" no tiene un
-- catalogo de respuestas, tiene una historia que se quiere poder releer tres
-- semanas despues. Encerrarla en fichas la empobrece y no gana nada, porque no
-- alimenta ninguna frase.
--
-- Estos cuatro son los que producen la confirmacion:
--
--   5   Que quiere mejorar    -> todo el [MEJORAR]
--   14  Prioridad principal   -> ordena [MEJORAR], no anade nada
--   7   Que no quiere perder  -> [MANTENER] y [PRESCINDIBLE], los dos
--   16  Confirmacion          -> no captura: redacta con los tres anteriores
--
-- El punto 4 ("Lo que funciona") parece el candidato obvio y no lo es: lo
-- valorado alli no entra en MANTENER salvo que se confirme como indispensable
-- en el 7, asi que el 7 ya lo cubre. Estructurarlo seria preguntar dos veces lo
-- mismo con distinta letra pequeña, y el cliente lo nota.
--
-- ======================================================================
-- ETIQUETAS CORTAS A PROPOSITO
-- ======================================================================
--
-- "Precio" y no "Pagar menos / optimizar costo". Una etiqueta larga ocupa una
-- fila entera de los 248px utiles y ninguna ficha comparte linea; cortas entran
-- dos o tres por fila y el panel del punto 5 baja de ~300px a ~160px. Se leen
-- de reojo en mitad de una videollamada, no se estudian.
--
-- ======================================================================
-- LOS IDS DE LAS OPCIONES NO SE TOCAN NUNCA MAS
-- ======================================================================
--
-- Son la clave por la que el punto 14 hereda y el 7 clasifica. Reescribir una
-- etiqueta esta bien; cambiar su id rompe en silencio todo lo ya respondido.
-- Se eligen legibles -"hospitalaria", no un uuid- justamente para que se note
-- si alguien los toca.
--
-- REVERSION
--
--   update public.playbook_items set answer_type='texto', intent_role=null,
--     options='[]'::jsonb, source_item_ids='{}'
--   where section_id = (la Fase 1 de este guion) and position in (5,7,14,16);

do $$
declare
  v_user_id uuid;
  v_section_id uuid;
  v_id_5 uuid;
  v_id_7 uuid;
  v_id_14 uuid;
  v_id_16 uuid;
begin
  select id into v_user_id from auth.users where email = 'planespro.cl@gmail.com';
  if v_user_id is null then
    raise notice 'No existe esa cuenta; no se toca nada.';
    return;
  end if;

  select s.id into v_section_id
  from public.playbook_sections s
  join public.playbooks p on p.id = s.playbook_id
  where p.user_id = v_user_id and p.name = 'Asesoría PlanesPro' and s.position = 1;

  if v_section_id is null then
    raise notice 'No esta el guion sembrado por la 150; no se toca nada.';
    return;
  end if;

  select id into v_id_5  from public.playbook_items where section_id = v_section_id and position = 5;
  select id into v_id_7  from public.playbook_items where section_id = v_section_id and position = 7;
  select id into v_id_14 from public.playbook_items where section_id = v_section_id and position = 14;
  select id into v_id_16 from public.playbook_items where section_id = v_section_id and position = 16;

  if v_id_5 is null or v_id_7 is null or v_id_14 is null or v_id_16 is null then
    raise exception 'Falta alguno de los puntos 5, 7, 14 o 16 en la Fase 1';
  end if;

  -- 5 · Que quiere mejorar. El unico con catalogo propio.
  update public.playbook_items
  set answer_type = 'opciones_multi',
      intent_role = 'mejorar',
      options = '[
        {"id": "precio",         "label": "Precio"},
        {"id": "hospitalaria",   "label": "Hospitalaria"},
        {"id": "ambulatoria",    "label": "Ambulatoria"},
        {"id": "urgencias",      "label": "Urgencias"},
        {"id": "red",            "label": "Red de clínicas"},
        {"id": "topes",          "label": "Topes"},
        {"id": "medicamentos",   "label": "Medicamentos"},
        {"id": "cargas",         "label": "Cargas"},
        {"id": "integracion",    "label": "Integración"},
        {"id": "libre_eleccion", "label": "Libre elección"},
        {"id": "simplicidad",    "label": "Simplicidad"}
      ]'::jsonb,
      updated_at = now()
  where id = v_id_5;

  -- 14 · Prioridad principal. Sus opciones son las marcadas en el 5: sin
  -- catalogo propio, nada que mantener.
  update public.playbook_items
  set answer_type = 'opciones_una',
      intent_role = 'prioridad',
      options = '[]'::jsonb,
      source_item_ids = array[v_id_5],
      updated_at = now()
  where id = v_id_14;

  -- 7 · Que no quiere perder. Clasifica lo marcado en el 5, no un catalogo fijo
  -- de once: preguntarle por ocho categorias que nunca menciono es un
  -- formulario, no una conversacion.
  update public.playbook_items
  set answer_type = 'criterios',
      intent_role = 'importancia',
      options = '[]'::jsonb,
      source_item_ids = array[v_id_5],
      updated_at = now()
  where id = v_id_7;

  -- 16 · La confirmacion. Declara sus tres fuentes en vez de resumir "todo lo
  -- de arriba": reordenar el guion no puede vaciarle el alcance en silencio.
  update public.playbook_items
  set answer_type = 'checkpoint',
      intent_role = null,
      options = '[]'::jsonb,
      source_item_ids = array[v_id_5, v_id_14, v_id_7],
      updated_at = now()
  where id = v_id_16;
end;
$$;
