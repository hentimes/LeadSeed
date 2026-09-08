-- enroll_leads_in_flow
--
-- Tipo:           funcion nueva
-- Objeto:         public.enroll_leads_in_flow(uuid, uuid[], boolean, integer)
-- Clase:          escritura en tanda
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion)
--
-- PROPOSITO
--
-- Inscribir a mucha gente de una vez, cada uno por donde va.
--
-- La 158 dejo inscribir a uno a partir del paso que ya recibio. Pero el caso
-- real no es uno: es "de los 1.900 leads, los 100 que ya recibieron el mensaje
-- del paso 2 y nunca estuvieron en el flujo". De a uno son 100 clics y 100
-- viajes a la red, y a la mitad se pierde la cuenta de quien falta.
--
-- POR QUE EN UNA FUNCION Y NO EN UN BUCLE DEL CLIENTE
--
-- Un bucle en el navegador son 100 idas y vueltas -unos diez segundos con la
-- pantalla a medias- y, sobre todo, deja el trabajo a medio hacer si alguien
-- cierra el panel: 43 inscritos y 57 no, sin nada que lo diga. Aca es un viaje.
--
-- CADA UNO FALLA POR SU CUENTA
--
-- El bucle atrapa el error de cada lead en vez de abortar la tanda. Es
-- deliberado: el motivo mas comun de fallo -"ya tiene una inscripcion activa de
-- este canal"- no es un error del usuario sino un dato, y no puede impedir que
-- se inscriban los otros noventa y nueve. Se devuelven las cuentas para poder
-- decir exactamente que paso.
--
-- Cada iteracion abre una subtransaccion (el `exception` de plpgsql). Con
-- centenares es aceptable; por eso ademas hay un tope explicito, que evita que
-- una llamada mal armada intente inscribir la agenda entera.
--
-- LA DETECCION SE REHACE AQUI, NO SE RECIBE DEL CLIENTE
--
-- El cliente ya sabe por que paso va cada lead -se lo dijo `flow_resume_points`
-- al pintar la lista- y podria mandarlo. No se hace: entre que se pinto la
-- pantalla y se pulsa el boton puede haberse enviado otro mensaje, y sobre todo
-- porque un parametro "estos son los pasos que doy por hechos" es exactamente
-- la clase de dato que no conviene dejar que ponga quien llama. La misma regla,
-- calculada en el mismo sitio, da la misma respuesta.

CREATE OR REPLACE FUNCTION public.enroll_leads_in_flow(
  p_flow_id uuid,
  p_lead_ids uuid[],
  p_use_detection boolean DEFAULT true,
  p_start_step integer DEFAULT 1
)
RETURNS TABLE (
  inscritos integer,
  ya_en_flujo integer,
  fallidos integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_lead uuid;
  v_last integer;
  v_base timestamptz;
  v_ok integer := 0;
  v_ocupados integer := 0;
  v_fallidos integer := 0;
begin
  if p_lead_ids is null or array_length(p_lead_ids, 1) is null then
    inscritos := 0; ya_en_flujo := 0; fallidos := 0;
    return next;
    return;
  end if;

  if array_length(p_lead_ids, 1) > 500 then
    raise exception 'no se pueden inscribir mas de 500 leads de una vez';
  end if;

  -- Que el flujo sea propio se comprueba una vez y no una por lead:
  -- `enroll_lead_in_flow_from` lo revalida igual en cada llamada, pero si no es
  -- tuyo conviene fallar de entrada y no 500 veces en silencio.
  if not exists (
    select 1 from public.message_flows where id = p_flow_id and user_id = auth.uid()
  ) then
    raise exception 'el flujo % no existe o no es tuyo', p_flow_id;
  end if;

  foreach v_lead in array p_lead_ids loop
    if p_use_detection then
      -- El paso mas avanzado cuya plantilla consta enviada, y la fecha de ese
      -- envio. Misma regla que `flow_resume_points`.
      select st.step_order, s.sent_at
        into v_last, v_base
      from public.send_logs s
      join public.message_flow_steps st
        ON st.template_id = s.template_id
       AND st.flow_id = p_flow_id
      where s.lead_id = v_lead
      order by st.step_order desc, s.sent_at desc
      limit 1;

      v_last := coalesce(v_last, 0);
    else
      v_last := greatest(coalesce(p_start_step, 1) - 1, 0);
      v_base := null;
    end if;

    begin
      perform public.enroll_lead_in_flow_from(p_flow_id, v_lead, v_last, v_base);
      v_ok := v_ok + 1;
    exception
      when unique_violation then
        -- Ya tiene una inscripcion activa de este canal. Es un dato, no un
        -- fallo: se cuenta aparte para poder decirlo.
        v_ocupados := v_ocupados + 1;
      when others then
        v_fallidos := v_fallidos + 1;
    end;
  end loop;

  inscritos := v_ok;
  ya_en_flujo := v_ocupados;
  fallidos := v_fallidos;
  return next;
end;
$$;

REVOKE ALL ON FUNCTION public.enroll_leads_in_flow(uuid, uuid[], boolean, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.enroll_leads_in_flow(uuid, uuid[], boolean, integer) TO authenticated;

COMMENT ON FUNCTION public.enroll_leads_in_flow(uuid, uuid[], boolean, integer) IS
  'Inscribe varios leads en un flujo de una vez, cada uno desde el paso que ya recibio si p_use_detection. Cada lead falla por su cuenta; devuelve las cuentas de inscritos, ya inscritos en el canal y fallidos.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.enroll_leads_in_flow(uuid, uuid[], boolean, integer);
