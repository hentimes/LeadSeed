-- reschedule_flow_steps
--
-- Tipo:           funcion nueva
-- Objeto:         public.reschedule_flow_steps(jsonb)
-- Clase:          escritura en tanda
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion)
--
-- PROPOSITO
--
-- Mover las fechas de los pasos que no caben en el cupo del dia.
--
-- EL PROBLEMA QUE RESUELVE
--
-- Dos flujos de 200 personas que vencen el mismo dia son 400 mensajes, y el
-- tope diario razonable de WhatsApp son 50. Bloquear al llegar a 50 no alcanza:
-- deja 350 atrasados que al dia siguiente son 350 mas los nuevos, y la bola
-- crece sola. Hay que REPARTIR, no solo frenar.
--
-- El reparto -a quien le toca que dia- lo decide el cliente, en
-- `whatsappQuota.ts`, que es puro y esta probado. Esta funcion solo escribe lo
-- que se decidio, de una vez y en una transaccion: 350 `update` sueltos desde
-- el navegador tardan una eternidad y dejan la agenda a medio reordenar si
-- alguien cierra el panel.
--
-- POR QUE JSONB Y NO DOS ARREGLOS PARALELOS
--
-- Con `p_progress_ids bigint[]` y `p_due_ats timestamptz[]` la correspondencia
-- entre uno y otro depende de que los dos lleguen en el mismo orden y con el
-- mismo largo. Es una invariante que nadie puede comprobar al leer la llamada.
-- Con un arreglo de objetos, cada fecha viaja pegada a su paso.
--
-- QUE NO HACE
--
-- No toca `status`. Un paso que ya estaba en `toca` y se empuja al futuro
-- vuelve a `pendiente` solo cuando `promote_due_flow_steps` lo reevalue, que es
-- quien manda sobre ese estado. Escribir el estado aqui seria una segunda
-- autoridad sobre lo mismo.
--
-- SEGURIDAD
--
-- `SECURITY INVOKER`: la politica `message_flow_progress_update_own` de la 108
-- filtra sola. Un id de otro usuario simplemente no actualiza ninguna fila, y
-- el recuento devuelto lo delata.

CREATE OR REPLACE FUNCTION public.reschedule_flow_steps(p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  v_movidos integer;
begin
  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    raise exception 'se esperaba un arreglo de {progress_id, due_at}';
  end if;

  if jsonb_array_length(p_updates) > 2000 then
    raise exception 'no se pueden reprogramar mas de 2000 pasos de una vez';
  end if;

  with cambios as (
    select
      (elemento ->> 'progress_id')::bigint as progress_id,
      (elemento ->> 'due_at')::timestamptz as due_at
    from jsonb_array_elements(p_updates) as elemento
  )
  update public.message_flow_progress p
  set due_at = c.due_at,
      updated_at = now()
  from cambios c
  where p.id = c.progress_id
    -- Solo lo que todavia no se mando: reprogramar un paso ya registrado
    -- reescribiria el pasado.
    and p.status in ('pendiente', 'toca');

  get diagnostics v_movidos = row_count;
  return v_movidos;
end;
$$;

REVOKE ALL ON FUNCTION public.reschedule_flow_steps(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.reschedule_flow_steps(jsonb) TO authenticated;

COMMENT ON FUNCTION public.reschedule_flow_steps(jsonb) IS
  'Mueve el due_at de varios pasos pendientes de una vez, a partir de un arreglo de {progress_id, due_at}. No toca status. Respeta RLS por SECURITY INVOKER.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.reschedule_flow_steps(jsonb);
