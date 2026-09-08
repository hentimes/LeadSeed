-- advance_flow_steps
--
-- Tipo:           funcion nueva
-- Objeto:         public.advance_flow_steps(timestamptz)
-- Clase:          escritura en tanda
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion)
--
-- PROPOSITO
--
-- Traer a hoy pasos que estaban programados para mas adelante.
--
-- POR QUE HACE FALTA
--
-- El flujo dice "3 dias despues del anterior" y la aplicacion lo cumple al pie
-- de la letra: si el paso 1 salio el 5, el 2 vence el 8 y hasta el 8 no hay
-- nada que mandar. Correcto, y a la vez insuficiente.
--
-- La espera es una intencion, no una ley. Quien maneja la agenda mira las
-- dieciocho personas que esperan el paso 2 y decide mandarlo hoy: porque tiene
-- cupo libre, porque manana no va a poder, o simplemente porque quiere. Hasta
-- ahora no habia forma de hacerlo: la unica salida era esperar, o editar el
-- flujo -que esta prohibido con gente dentro- o sacarlos y reinscribirlos.
--
-- Una regla que no se puede saltar deliberadamente no es una regla, es una
-- jaula.
--
-- QUE HACE Y QUE NO
--
-- Mueve `due_at` a ahora y pone `toca` en los pasos POR HACER que vencian
-- dentro de la ventana pedida. No toca los ya registrados ni los omitidos: eso
-- seria reescribir el pasado.
--
-- No adelanta pasos cuyo paso anterior todavia no salio, porque esos no
-- existen: el progreso de un paso se crea recien cuando se registra el
-- anterior. La secuencia sigue intacta; lo unico que cambia es cuando vence lo
-- que ya estaba en la sala de espera.
--
-- POR QUE PONE `toca` Y NO SOLO LA FECHA
--
-- Podria dejarlo en `pendiente` y confiar en que `promote_due_flow_steps` lo
-- promueva al consultar. Se pone aqui para que el efecto sea inmediato y
-- atomico: el usuario pulsa "traer a hoy" y la cola ya los tiene, sin depender
-- de que otra funcion corra despues. Es la misma transaccion, asi que no hay
-- ventana en la que la fecha diga una cosa y el estado otra -que es
-- exactamente el fallo que costo la 165 y la 167-.
--
-- SEGURIDAD
--
-- `SECURITY INVOKER`: la politica de actualizacion de la 108 filtra sola, y un
-- id ajeno simplemente no actualiza nada.

CREATE OR REPLACE FUNCTION public.advance_flow_steps(p_hasta timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  v_movidos integer;
begin
  if p_hasta is null then
    raise exception 'hace falta una fecha limite';
  end if;

  update public.message_flow_progress p
  set due_at = now(),
      status = 'toca',
      updated_at = now()
  from public.message_flow_enrollments e
  join public.message_flows f on f.id = e.flow_id
  where e.id = p.enrollment_id
    and p.status in ('pendiente', 'toca')
    and p.due_at is not null
    and p.due_at <= p_hasta
    and e.status = 'activa'
    -- Un flujo pausado no manda, tampoco adelantando. Mismo criterio que la
    -- cola del dia desde la 165.
    and f.is_active;

  get diagnostics v_movidos = row_count;
  return v_movidos;
end;
$$;

REVOKE ALL ON FUNCTION public.advance_flow_steps(timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.advance_flow_steps(timestamptz) TO authenticated;

COMMENT ON FUNCTION public.advance_flow_steps(timestamptz) IS
  'Trae a ahora los pasos por hacer que vencian hasta la fecha dada, dejandolos listos para despachar. No toca los ya registrados ni los flujos pausados.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.advance_flow_steps(timestamptz);
