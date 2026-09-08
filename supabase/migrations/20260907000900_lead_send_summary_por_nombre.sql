-- lead_send_summary_por_nombre
--
-- Tipo:           reemplazo de funcion
-- Objeto:         public.lead_send_summary()
-- Clase:          correccion de una regla de deteccion
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la definicion de la 156)
--
-- EL MISMO FALLO QUE ARREGLO LA 163, EN LA OTRA PANTALLA
--
-- La 163 corrigio la deteccion de los flujos: `send_logs.template_id` es
-- `on delete set null`, asi que al borrar una plantilla sus envios pierden el
-- vinculo y el sistema deja de reconocerlos.
--
-- El mismo agujero estaba aqui. `template_ids` -que agrega la 156- se arma con
-- `array_agg(distinct s.template_id)` y descarta los nulos, asi que un envio
-- hecho con una plantilla ya borrada no entra en la lista. Y esa lista es la
-- que alimenta el filtro "Mensaje: X" del envio masivo, con el que se decide a
-- quien NO volver a escribirle.
--
-- O sea: las dos pantallas contestaban la misma pregunta -"¿ya le mande esto?"-
-- y desde el 163 lo hacian distinto. Una lo reconocia y la otra no.
--
-- LA CORRECCION
--
-- Cuando el vinculo esta roto, se resuelve por el nombre guardado en el envio
-- -`template_name`, que la 106 conserva "tal como estaba en el momento del
-- envio"- contra las plantillas VIVAS del mismo dueño. Asi el id que entra en
-- la lista es el de la plantilla que hoy se llama igual, que es exactamente la
-- que el filtro ofrece elegir.
--
-- Solo cuando el id es nulo, por lo mismo que en la 163: con el vinculo intacto
-- el id es la verdad y el nombre puede no serlo.
--
-- Ojo con el ultimo envio: `last_template_id` NO se toca. Ahi un nulo significa
-- "la plantilla ya no existe", y la fila lo pinta cayendo al nombre guardado,
-- que es lo correcto para mostrar. Lo que se arregla es la LISTA con la que se
-- filtra, no la etiqueta que se pinta.

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
  'Un resumen por lead de lo que se le envio: cuantos mensajes, cuando fue el ultimo, con que plantilla y que plantillas recibio en total. Los envios cuya plantilla se borro se resuelven por el nombre guardado. Respeta RLS por SECURITY INVOKER.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Volver a la definicion de la 156.
