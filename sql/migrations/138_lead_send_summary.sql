-- lead_send_summary
--
-- Tipo:           query permanente (funcion nueva)
-- Objeto:         public.lead_send_summary()
-- Clase:          lectura agregada
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion)
--
-- PROPOSITO
--
-- Al elegir destinatarios no se ve que se le mando antes a cada lead. La lista
-- muestra nombre y telefono, y nada mas: no hay forma de saber si a esa persona
-- ya se le escribio, cuando, ni con que plantilla. Con 78 paginas de leads, eso
-- convierte cada envio en una apuesta.
--
-- Esta funcion devuelve UNA fila por lead con el resumen de lo que se le envio.
--
-- POR QUE UNA FUNCION AGREGADA Y NO TRAERSE `send_logs` AL CLIENTE
--
-- Ya hay un precedente que conviene no repetir: `fetchSendLogCountRowsByUser`
-- se trae todas las filas de envio del usuario para contarlas en el navegador.
-- Funciona con once envios y no escala: el coste crece con los MENSAJES
-- enviados, que es lo que mas crece en este producto, mientras que lo que la
-- pantalla necesita crece con los LEADS.
--
-- Aca el trabajo se hace donde estan los datos y viaja una fila por lead.
--
-- SEGURIDAD
--
-- `SECURITY INVOKER` explicito, igual que `community_comments_feed` de la 123:
-- corre con el rol de quien llama, asi que la politica de SELECT de `send_logs`
-- -que ya limita a `auth.uid() = user_id`- filtra sola. No hace falta repetir la
-- condicion aqui dentro, y repetirla seria una segunda fuente de verdad sobre
-- quien ve que.
--
-- QUE CUENTA Y QUE NO
--
-- Cuenta TODOS los envios, incluidos los que el usuario oculto del historial
-- con la marca de la migracion 135. Es la misma decision que ya documenta
-- `softDeleteSendLog`: borrar una linea del historial es ordenar una lista, no
-- negar que el mensaje se envio. Si aqui restara, un lead al que se le escribio
-- tres veces apareceria como no contactado por haber limpiado la vista.

CREATE OR REPLACE FUNCTION public.lead_send_summary()
RETURNS TABLE (
  lead_id uuid,
  total integer,
  last_sent_at timestamptz,
  last_template_id uuid,
  last_template_name text,
  last_template_type text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- `DISTINCT ON (lead_id)` con `ORDER BY lead_id, sent_at DESC` se queda con la
  -- fila mas reciente de cada lead; la ventana cuenta el total del grupo antes
  -- de descartar las demas.
  SELECT DISTINCT ON (s.lead_id)
    s.lead_id,
    count(*) OVER (PARTITION BY s.lead_id)::int AS total,
    s.sent_at AS last_sent_at,
    s.template_id AS last_template_id,
    s.template_name AS last_template_name,
    s.template_type AS last_template_type
  FROM public.send_logs s
  WHERE s.lead_id IS NOT NULL
  ORDER BY s.lead_id, s.sent_at DESC;
$$;

COMMENT ON FUNCTION public.lead_send_summary() IS
  'Un resumen por lead de lo que se le envio: cuantos mensajes, cuando fue el ultimo y con que plantilla. Respeta RLS por SECURITY INVOKER.';

GRANT EXECUTE ON FUNCTION public.lead_send_summary() TO authenticated;

-- El indice que hace barato el DISTINCT ON: sin el, ordenar por (lead_id,
-- sent_at) obliga a un sort completo de la tabla en cada llamada.
CREATE INDEX IF NOT EXISTS send_logs_lead_sent_idx
  ON public.send_logs (lead_id, sent_at DESC);

NOTIFY pgrst, 'reload schema';
