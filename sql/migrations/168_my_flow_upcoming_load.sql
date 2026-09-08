-- my_flow_upcoming_load
--
-- Tipo:           funcion nueva
-- Objeto:         public.my_flow_upcoming_load(integer)
-- Clase:          lectura agregada
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion)
--
-- PROPOSITO
--
-- Cuantos pasos vencen cada uno de los proximos dias.
--
-- POR QUE HACE FALTA: LA PANTALLA VACIA QUE MIENTE
--
-- "Hoy" solo sabe de lo que ya vencio. Cuando no hay nada vencido dice "Nada
-- pendiente por ahora", y eso, con dieciocho personas inscritas esperando el
-- paso 2, se lee como "el sistema perdio mis pendientes". No es falso -hoy no
-- hay nada que mandar- pero es la mitad de la frase, y la mitad que falta es
-- justo la que devuelve la confianza: **cuando si**.
--
-- Con esta funcion la misma pantalla puede decir "hoy no toca nada; lo proximo
-- son 18 el 10/09", que es una respuesta y no un vacio.
--
-- Y sirve para lo otro: ver el choque ANTES de que ocurra. Dos flujos que caen
-- el mismo dia se ven aqui con varios dias de anticipacion, en vez de
-- descubrirse la mañana en que hay cuatrocientos vencidos y cupo para cincuenta.
--
-- QUE CUENTA
--
-- Los pasos por hacer -`pendiente` y `toca`- de inscripciones activas en flujos
-- activos. Los mismos filtros que la cola del dia, para que las dos vistas
-- cuenten lo mismo: si un flujo pausado no manda, tampoco debe aparecer en la
-- proyeccion como si fuera a mandar.
--
-- Lo ya vencido se agrupa en su propio dia, que puede ser anterior a hoy. Quien
-- lo pinta decide si lo muestra como "atrasado" o lo suma al dia de hoy; aqui
-- no se redondea nada, porque redondear seria esconder el atraso.
--
-- SEGURIDAD
--
-- `SECURITY INVOKER`: las politicas `_select_own` de la 108 filtran solas.
--
-- EL DIA ES EL DEL SERVIDOR
--
-- `date_trunc('day', due_at)` agrupa en UTC, no en la zona de quien mira. Para
-- una proyeccion a varios dias la diferencia es de horas en los bordes y no
-- cambia ninguna decision; hacerlo en la zona del cliente exigiria pasarla como
-- parametro y ensuciar la firma por una precision que aqui no se usa. El cupo
-- del dia, donde si importa, sigue calculandose con el reloj del cliente.

CREATE OR REPLACE FUNCTION public.my_flow_upcoming_load(p_days integer DEFAULT 14)
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
    date_trunc('day', p.due_at)::date,
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

COMMENT ON FUNCTION public.my_flow_upcoming_load(integer) IS
  'Cuantos pasos por hacer vencen cada dia dentro de la ventana pedida, contando solo inscripciones y flujos activos. Sirve para explicar una vista de hoy vacia y para ver los choques antes de que ocurran.';

GRANT EXECUTE ON FUNCTION public.my_flow_upcoming_load(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.my_flow_upcoming_load(integer);
