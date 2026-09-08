-- lead_send_summary: agrega las plantillas que recibio cada lead
--
-- Tipo:           query permanente (reemplazo de funcion)
-- Objeto:         public.lead_send_summary()
-- Clase:          lectura agregada
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la definicion de la 138)
--
-- PROPOSITO
--
-- La 138 devuelve el ULTIMO envio de cada lead. Con eso se contesta "¿le
-- escribi?" y "¿cuando?", pero no "¿le mande ESTA plantilla?".
--
-- Y esa es la pregunta que se hace al armar una tanda: quien ya recibio el
-- primer mensaje no debe volver a recibirlo, y quien lo recibio hace tiempo es
-- justo a quien toca mandarle el segundo. Con solo la ultima plantilla la
-- respuesta es falsa en cuanto alguien recibio dos: un lead al que se le mando
-- la plantilla A y despues la B figuraba como "no recibio A".
--
-- Por eso se agrega `template_ids`: TODAS las plantillas distintas que recibio,
-- sin fecha ni orden. Es lo minimo para poder filtrar por plantilla sin
-- traerse `send_logs` entero al navegador, que es lo que la 138 evito.
--
-- POR QUE CTE Y NO UNA VENTANA MAS
--
-- La 138 contaba el total con `count(*) OVER (PARTITION BY lead_id)` junto al
-- `DISTINCT ON`. La misma receta no sirve para la lista de plantillas:
-- `array_agg(DISTINCT ...)` no se puede usar como funcion de ventana en
-- Postgres. Asi que el agregado se calcula aparte, agrupado, y se une con la
-- fila mas reciente.
--
-- POR QUE `DROP` Y NO `CREATE OR REPLACE`
--
-- Cambia el tipo de retorno -hay una columna nueva- y `CREATE OR REPLACE` no
-- puede cambiarlo. El drop es seguro: nada mas en la base depende de esta
-- funcion, solo la lee el cliente.

DROP FUNCTION IF EXISTS public.lead_send_summary();

CREATE FUNCTION public.lead_send_summary()
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
    -- `DISTINCT ON (lead_id)` con `ORDER BY lead_id, sent_at DESC` se queda con
    -- la fila mas reciente de cada lead.
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
    -- `array_remove(..., NULL)` porque un envio manual puede no tener plantilla:
    -- sin esto la lista traeria un NULL que el cliente tendria que filtrar.
    SELECT
      s.lead_id AS l_id,
      count(*)::int AS n,
      array_remove(array_agg(DISTINCT s.template_id), NULL) AS ids
    FROM public.send_logs s
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
  'Un resumen por lead de lo que se le envio: cuantos mensajes, cuando fue el ultimo, con que plantilla y que plantillas recibio en total. Respeta RLS por SECURITY INVOKER.';

GRANT EXECUTE ON FUNCTION public.lead_send_summary() TO authenticated;

NOTIFY pgrst, 'reload schema';
