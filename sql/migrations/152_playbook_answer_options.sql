-- Query permanente
-- Dominio: playbooks / respuestas por opciones
-- Objeto: public.playbook_items, public.playbook_run_items
-- Clase: columnas nuevas + restricciones
-- Descripcion: permite que un punto se responda con opciones en vez de texto
-- Proposito: capturar intencion estructurada para derivar una confirmacion
-- Dependencias: 148 (las tablas), 151 (el guard invertido)
-- Impacto: ninguno sobre lo existente; todo nace con el valor de hoy
-- Persistencia: permanente
-- Reversibilidad: total (drop de las columnas)
--
-- ======================================================================
-- LO QUE ESTO CAMBIA DE LA 148
-- ======================================================================
--
-- La cabecera de la 148 dice, textualmente:
--
--   "Sin ramificaciones ni respuestas estructuradas. Marcar un item como
--    `hecho` significa 'ya lo converse', NO 'respondio que si'."
--
-- La primera mitad deja de ser cierta con esta migracion. La segunda SIGUE
-- SIENDO CIERTA y es importante que no se confunda: seguimos sin ramificar
-- -ningun punto decide que preguntar segun lo respondido- y `hecho` sigue
-- significando "ya lo converse". Lo que se anade es que ALGUNOS puntos guarden
-- ademas QUE se respondio, en forma de opciones marcadas.
--
-- Se escribe aqui porque la 148 pedia expresamente que quedara constancia del
-- dia en que se cruzara esa linea.
--
-- ======================================================================
-- DOS EJES: COMO SE RESPONDE Y PARA QUE SIRVE
-- ======================================================================
--
--   answer_type  COMO se pinta el punto. Lo lee la interfaz.
--   intent_role  PARA QUE sirve la respuesta. Lo lee el motor.
--
-- Esa separacion es lo que impide que el negocio se meta en el producto. El
-- motor no sabe que es una isapre ni que significa "hospitalario": lee roles y
-- etiquetas. Las opciones concretas son contenido del playbook, igual que ya
-- lo son la pregunta y el soporte, asi que otro usuario puede crear "Llamada
-- en frio" con las suyas sin tocar una linea de codigo.
--
-- La restriccion `playbook_items_rol_coherente` impide que los dos ejes
-- discrepen: un rol de importancia sin clasificacion no significa nada.
--
-- ======================================================================
-- UNA SOLA FORMA PARA `selections`
-- ======================================================================
--
--   [{"id": "...", "value": "si"}, {"id": "...", "value": "indispensable"}]
--
-- Y no una forma por tipo de respuesta -un array de ids para la seleccion
-- multiple, un objeto para la clasificacion-. Dos formas serian dos analisis,
-- dos validaciones y una migracion el dia que se quiera contar algo. La
-- seleccion unica es la misma forma con un solo elemento.
--
-- ## El id se acuna una vez y sobrevive a la edicion de la etiqueta
--
-- Esto es invisible desde el DDL y es lo que sostiene la herencia entre
-- puntos: el punto que clasifica se refiere a las opciones del punto que las
-- ofrecio POR SU ID. Si el editor regenerase los ids al reetiquetar una
-- opcion, la herencia se rompe en silencio y las clasificaciones ya guardadas
-- quedan huerfanas, sin que nada falle.
--
-- ======================================================================
-- POR QUE `checkpoint_text` ES COLUMNA PROPIA Y NO REUSA `note`
-- ======================================================================
--
-- Con `note` no se puede distinguir "la persona borro la frase" de "la persona
-- nunca la toco": las dos son cadena vacia, las dos caen en "usa la generada",
-- y la frase se vuelve indeleble.
--
-- Ademas la fila plegada pinta un lapicito cuando hay `note`, para poder
-- releer lo anotado. Guardando ahi la frase, ese lapicito diria "tiene nota"
-- cuando lo unico que hubo fue corregir una redaccion, que es otra cosa.
--
-- Un `null` en dieciseis de cada diecisiete filas no es un problema; ya es el
-- patron de `abandon_note` en la 148. A cambio, `note` sigue significando lo
-- mismo en los diecisiete puntos y el checkpoint conserva su nota ADEMAS de su
-- frase.
--
-- ======================================================================
-- REVERSION
-- ======================================================================
--
--   alter table public.playbook_run_items
--     drop column if exists selections,
--     drop column if exists checkpoint_text,
--     drop column if exists source_run_item_ids,
--     drop column if exists options,
--     drop column if exists intent_role,
--     drop column if exists answer_type;
--   alter table public.playbook_items
--     drop column if exists source_item_ids,
--     drop column if exists options,
--     drop column if exists intent_role,
--     drop column if exists answer_type;


-- ---------------------------------------------------- DEFINICION

alter table public.playbook_items
  add column if not exists answer_type text not null default 'texto',
  add column if not exists intent_role text,
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists source_item_ids uuid[] not null default '{}';

/*
 * `not null default 'texto'` y no nullable: asi toda fila existente se
 * convierte en un punto de texto EXPLICITO y nada cambia de comportamiento.
 * Con nulo habria que escribir `coalesce(answer_type, 'texto')` en cada sitio
 * de lectura, para siempre.
 */
alter table public.playbook_items
  drop constraint if exists playbook_items_answer_type_valido;
alter table public.playbook_items
  add constraint playbook_items_answer_type_valido check (
    answer_type in ('texto', 'opciones_una', 'opciones_multi', 'criterios', 'checkpoint')
  );

alter table public.playbook_items
  drop constraint if exists playbook_items_rol_coherente;
alter table public.playbook_items
  add constraint playbook_items_rol_coherente check (
    intent_role is null
    or (intent_role = 'importancia' and answer_type = 'criterios')
    or (intent_role in ('mejorar', 'prioridad') and answer_type in ('opciones_una', 'opciones_multi'))
  );

/*
 * La cota no es decorativa: `options` se COPIA a cada fila de
 * playbook_run_items, que es la tabla que mas crece -N filas por recorrido-.
 * Un jsonb sin limite ahi se multiplica por cada reunion.
 */
alter table public.playbook_items
  drop constraint if exists playbook_items_options_validas;
alter table public.playbook_items
  add constraint playbook_items_options_validas check (
    jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 30
  );

comment on column public.playbook_items.answer_type is
  'COMO se responde el punto. Lo lee la interfaz. "texto" es lo de siempre y el valor por defecto.';

comment on column public.playbook_items.intent_role is
  'PARA QUE sirve la respuesta. Lo lee el motor de deduccion, nunca la interfaz. Nulo = la respuesta se guarda pero no alimenta ninguna frase.';

comment on column public.playbook_items.options is
  'Catalogo de opciones: [{id, label}]. EL ID SE ACUNA UNA VEZ Y NO CAMBIA NUNCA, aunque se reescriba su etiqueta: es la clave por la que los puntos posteriores heredan y clasifican. Regenerarlo rompe la herencia en silencio.';

comment on column public.playbook_items.source_item_ids is
  'De que puntos hereda sus opciones: "las que quedaron marcadas alli". Sin FK a proposito -es informativo, como item_id en la ejecucion- y en array porque un punto puede clasificar la union de varios origenes. El checkpoint usa esta misma columna para declarar que puntos resume.';


-- ----------------------------------------------------- EJECUCION

alter table public.playbook_run_items
  add column if not exists answer_type text not null default 'texto',
  add column if not exists intent_role text,
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists source_run_item_ids uuid[] not null default '{}',
  add column if not exists selections jsonb not null default '[]'::jsonb,
  add column if not exists checkpoint_text text;

alter table public.playbook_run_items
  drop constraint if exists playbook_run_items_answer_type_valido;
alter table public.playbook_run_items
  add constraint playbook_run_items_answer_type_valido check (
    answer_type in ('texto', 'opciones_una', 'opciones_multi', 'criterios', 'checkpoint')
  );

/*
 * El tope es mayor que el de la definicion porque un punto de clasificacion
 * hereda de VARIOS origenes y podria acabar clasificando mas opciones de las
 * que ofrece un solo catalogo.
 */
alter table public.playbook_run_items
  drop constraint if exists playbook_run_items_selections_validas;
alter table public.playbook_run_items
  add constraint playbook_run_items_selections_validas check (
    jsonb_typeof(selections) = 'array' and jsonb_array_length(selections) <= 60
  );

-- Un punto de texto con selecciones es un sinsentido esperando a ocurrir.
alter table public.playbook_run_items
  drop constraint if exists playbook_run_items_seleccion_coherente;
alter table public.playbook_run_items
  add constraint playbook_run_items_seleccion_coherente check (
    answer_type <> 'texto' or selections = '[]'::jsonb
  );

-- Y una frase de confirmacion en un punto que no es un checkpoint, tambien.
alter table public.playbook_run_items
  drop constraint if exists playbook_run_items_checkpoint_coherente;
alter table public.playbook_run_items
  add constraint playbook_run_items_checkpoint_coherente check (
    answer_type = 'checkpoint' or checkpoint_text is null
  );

comment on column public.playbook_run_items.options is
  'Copia historica del catalogo. Es la razon de ser mas fuerte del snapshot: de estas etiquetas se DERIVA una frase que se le presenta al cliente como acuerdo, asi que reescribir la definicion no puede cambiar lo que se acordo en septiembre.';

comment on column public.playbook_run_items.selections is
  'Lo respondido: [{id, value}]. Una sola forma para los cuatro tipos -la seleccion unica es la misma con un elemento- para no acabar con dos analisis y dos validaciones.';

comment on column public.playbook_run_items.checkpoint_text is
  'La frase de confirmacion EDITADA a mano. Nulo significa "usa la derivada"; cadena vacia significa "la persona la borro a proposito". Con `note` esas dos cosas eran indistinguibles y la frase quedaba indeleble.';

comment on column public.playbook_run_items.source_run_item_ids is
  'Los origenes ya traducidos a items de ESTE recorrido. Los resuelve start_my_playbook_run al arrancar: se congela la estructura de la dependencia, no su contenido.';
