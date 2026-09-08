-- my_flow_positions
--
-- Tipo:           funcion nueva
-- Objeto:         public.my_flow_positions()
-- Clase:          lectura agregada
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion)
--
-- PROPOSITO
--
-- Saber, para toda la agenda de una vez, quien esta en un flujo y por que paso
-- va.
--
-- La pantalla de inscribir lista los leads del canal y nada mas. Con 1.900
-- leads y varios flujos en marcha, eso deja tres preguntas sin respuesta justo
-- donde hay que decidir: a quien ya inscribi, en cual, y por donde va. Sin
-- ellas se inscribe a ciegas -y a quien ya esta en un flujo del mismo canal el
-- indice unico de la 108 le rechaza la inscripcion DESPUES de pulsar, que es la
-- peor forma de enterarse-.
--
-- POR QUE UNA FUNCION Y NO CONSULTAR DESDE EL CLIENTE
--
-- Responderlo en el navegador pide tres viajes -inscripciones, progreso,
-- pasos- y cruzarlos a mano. Aca es un solo viaje con una fila por inscripcion
-- activa, que son pocas por definicion: como mucho una por lead y canal.
--
-- QUE ES "POR DONDE VA"
--
-- El paso PENDIENTE mas cercano, no el ultimo hecho: es el que contesta "que le
-- toca ahora". Un `left join` a proposito, porque una inscripcion activa puede
-- no tener ninguna fila pendiente -pasa entre que se registra un paso y el
-- trigger crea el siguiente, y con un flujo al que se le agregaron pasos
-- despues-. En ese caso `step_order` y `due_at` vienen nulos y quien lo lee
-- decide como contarlo, en vez de que la fila desaparezca y el lead parezca no
-- estar inscrito.
--
-- SEGURIDAD
--
-- `SECURITY INVOKER`: las politicas `_select_own` de la 108 -en inscripciones,
-- flujos, progreso y pasos- filtran solas. No hace falta repetir el `user_id`
-- aqui dentro, y repetirlo seria una segunda fuente de verdad sobre quien ve
-- que.

CREATE OR REPLACE FUNCTION public.my_flow_positions()
RETURNS TABLE (
  lead_id uuid,
  flow_id uuid,
  flow_name text,
  channel text,
  step_order integer,
  due_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- `DISTINCT ON (lead_id, flow_id)` con el orden de abajo se queda con el paso
  -- pendiente mas temprano de cada inscripcion. `nulls last` para que una fila
  -- sin pendiente no le gane a una que si lo tiene.
  SELECT DISTINCT ON (e.lead_id, e.flow_id)
    e.lead_id,
    e.flow_id,
    f.name,
    f.channel,
    st.step_order,
    p.due_at
  FROM public.message_flow_enrollments e
  JOIN public.message_flows f
    ON f.id = e.flow_id
  LEFT JOIN public.message_flow_progress p
    ON p.enrollment_id = e.id
   AND p.status IN ('pendiente', 'toca')
  LEFT JOIN public.message_flow_steps st
    ON st.id = p.step_id
  WHERE e.status = 'activa'
  ORDER BY e.lead_id, e.flow_id, st.step_order ASC NULLS LAST;
$$;

COMMENT ON FUNCTION public.my_flow_positions() IS
  'Una fila por inscripcion activa: en que flujo esta cada lead y que paso le toca. step_order nulo significa inscrito sin nada pendiente. Respeta RLS por SECURITY INVOKER.';

GRANT EXECUTE ON FUNCTION public.my_flow_positions() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.my_flow_positions();
