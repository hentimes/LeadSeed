-- upcoming_load_en_zona_local
--
-- Tipo:           reemplazo de funcion (cambia la firma)
-- Objeto:         public.my_flow_upcoming_load(integer, text)
-- Clase:          correccion de un fallo
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la 168)
--
-- EL FALLO: LA PANTALLA MOSTRABA UN DIA QUE NO ERA
--
-- La 168 agrupa con `date_trunc('day', due_at)`, o sea en UTC, y su cabecera lo
-- justificaba asi: "para una proyeccion a varios dias la diferencia es de horas
-- en los bordes y no cambia ninguna decision".
--
-- Es falso, y el caso que lo demuestra es el normal, no un borde raro. Un paso
-- que vence el 8 de septiembre a las 21:00 en Santiago es el 9 a las 00:00 en
-- UTC. La base lo agrupaba en el dia 9; el cliente recibia "2026-09-09", lo
-- parseaba como medianoche UTC -que en Santiago es el 8 a las 21:00- y lo
-- pintaba como "8/9".
--
-- O sea: la base decia 9, la pantalla decia 8, y las dos se referian al mismo
-- instante. Mientras solo se pintaba una etiqueta, el error pasaba por bueno
-- porque el numero que se veia era, por casualidad, el correcto. Dejo de pasar
-- en cuanto la pantalla tuvo que DECIDIR con ese dato -"¿lo proximo es hoy o
-- otro dia?"-: comparaba el 9 contra el 8 y contestaba mal, ofreciendo "traer a
-- hoy" mensajes cuya fecha pautada ya era hoy.
--
-- LA CORRECCION
--
-- El dia se agrupa en la zona de quien mira, que viaja como parametro. Postgres
-- lo resuelve con `AT TIME ZONE`, que ya conoce el calendario y sus cambios de
-- hora; calcularlo con un desfase en minutos habria fallado dos veces al año.
--
-- El cliente manda su zona IANA -`Intl.DateTimeFormat().resolvedOptions()`- y
-- ademas parsea el dia como fecha LOCAL y no como instante UTC. Las dos puntas
-- tenian que cambiar: arreglar solo una habria movido el error de sitio.
--
-- `UTC` queda como valor por defecto para que una llamada sin zona siga siendo
-- valida y se comporte como antes.
--
-- POR QUE `DROP` Y NO `CREATE OR REPLACE`
--
-- Agregar un parametro con valor por defecto no reemplaza la funcion vieja:
-- crea una sobrecarga, y una llamada con un solo argumento se vuelve ambigua.
-- Postgres la rechaza en tiempo de ejecucion y el error no dice que sobran dos
-- funciones.

DROP FUNCTION IF EXISTS public.my_flow_upcoming_load(integer);

CREATE OR REPLACE FUNCTION public.my_flow_upcoming_load(
  p_days integer DEFAULT 14,
  p_tz text DEFAULT 'UTC'
)
RETURNS TABLE (
  dia date,
  cantidad integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    -- En la zona de quien mira. `AT TIME ZONE` convierte el instante a la hora
    -- local de esa zona; recien ahi tiene sentido preguntar de que dia es.
    (p.due_at AT TIME ZONE coalesce(nullif(p_tz, ''), 'UTC'))::date,
    count(*)::int
  FROM public.message_flow_progress p
  JOIN public.message_flow_enrollments e ON e.id = p.enrollment_id
  JOIN public.message_flows f ON f.id = e.flow_id
  WHERE p.user_id = auth.uid()
    AND p.status IN ('pendiente', 'toca')
    AND e.status = 'activa'
    AND f.is_active
    AND p.due_at IS NOT NULL
    AND p.due_at < now() + make_interval(days => greatest(coalesce(p_days, 14), 1))
  GROUP BY 1
  ORDER BY 1;
$$;

COMMENT ON FUNCTION public.my_flow_upcoming_load(integer, text) IS
  'Cuantos pasos por hacer vencen cada dia, agrupados en la zona horaria de quien consulta. Solo inscripciones y flujos activos.';

GRANT EXECUTE ON FUNCTION public.my_flow_upcoming_load(integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.my_flow_upcoming_load(integer, text);
--   y volver a crear la de la 168.
