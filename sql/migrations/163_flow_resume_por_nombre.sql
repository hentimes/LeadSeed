-- flow_resume_por_nombre
--
-- Tipo:           reemplazo de dos funciones
-- Objeto:         public.flow_resume_points(uuid), public.enroll_leads_in_flow(uuid, uuid[], boolean, integer)
-- Clase:          correccion de una regla de deteccion
-- Persistencia:   permanente
-- Reversibilidad: total (volver a las definiciones de la 158 y la 160)
--
-- EL FALLO
--
-- La deteccion cruzaba lo enviado con los pasos del flujo por `template_id`, y
-- por nada mas. Pero `send_logs.template_id` tiene `on delete set null` desde la
-- 006: **al borrar una plantilla, sus envios pierden el vinculo**.
--
-- El resultado es que a quien recibio "WS Cold #1" con una plantilla que
-- despues se borro, el sistema le decia que no habia recibido nada. Y no era un
-- caso raro: es lo que pasa siempre que se limpian plantillas duplicadas, que
-- es justo lo que uno hace antes de armar un flujo en serio.
--
-- Peor todavia, era invisible: no habia error ni aviso, esos contactos
-- sencillamente no aparecian en "Ya recibio mensajes" y no habia forma de
-- retomarlos desde donde iban.
--
-- LA CORRECCION: CAER AL NOMBRE GUARDADO
--
-- El envio no perdio la informacion, solo el vinculo. La 106 agrego
-- `send_logs.template_name`, que es "el nombre de la plantilla EN EL MOMENTO
-- del envio" y sobrevive al borrado. Cuando el vinculo esta roto, ese nombre es
-- la evidencia que queda.
--
-- Asi que la regla pasa a ser: coincide por `template_id`, o -solo si el
-- `template_id` es nulo- por el nombre que se guardo con el envio.
--
-- POR QUE SOLO CUANDO ES NULO
--
-- Porque con el vinculo intacto el id es la verdad y el nombre puede no serlo:
-- una plantilla se renombra, y dos plantillas distintas pueden llamarse igual.
-- El nombre no compite con el id, lo sustituye cuando el id ya no existe.
--
-- El riesgo que queda es acotado y se acepta a sabiendas: si se borro una
-- plantilla llamada como la del paso pero con otro texto, el envio contara como
-- ese paso. Es preferible a lo contrario -dar por no contactado a alguien que
-- si lo fue-, que es el error que hace que se le mande dos veces el mismo
-- mensaje. Y la lista lo enseña antes de inscribir: "Ya recibio el paso 1" con
-- su fecha, para poder desmentirlo.
--
-- LA REGLA VIVE EN UN SOLO SITIO
--
-- La 160 repetia la deteccion dentro del bucle de la inscripcion en tanda. Eran
-- dos copias de la misma regla, y esta correccion habria arreglado una y dejado
-- la otra mintiendo: la lista mostraria a los 50 y la tanda los inscribiria
-- desde el paso 1. Ahora `enroll_leads_in_flow` lee `flow_resume_points` -una
-- sola vez, a un mapa- en vez de repetir la consulta.

-- ------------------------------------------------------------------ LECTURA

CREATE OR REPLACE FUNCTION public.flow_resume_points(p_flow_id uuid)
RETURNS TABLE (
  lead_id uuid,
  last_done_order integer,
  last_sent_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (s.lead_id)
    s.lead_id,
    st.step_order,
    s.sent_at
  FROM public.send_logs s
  JOIN public.message_flow_steps st
    ON st.flow_id = p_flow_id
  JOIN public.templates t
    ON t.id = st.template_id
  WHERE s.lead_id IS NOT NULL
    AND (
      -- El vinculo, cuando existe.
      s.template_id = st.template_id
      -- El nombre guardado, cuando la plantilla se borro y el vinculo se
      -- perdio. Ver la cabecera: no compite con el id, lo sustituye.
      OR (
        s.template_id IS NULL
        AND s.template_name IS NOT NULL
        AND s.template_name = t.name
      )
    )
  ORDER BY s.lead_id, st.step_order DESC, s.sent_at DESC;
$$;

COMMENT ON FUNCTION public.flow_resume_points(uuid) IS
  'Por que paso de un flujo va cada lead segun lo que ya se le envio. Cruza por template_id y, si la plantilla se borro y el vinculo quedo nulo, por el nombre guardado en el envio. Una fila por lead. Respeta RLS por SECURITY INVOKER.';

-- ---------------------------------------------------------------- ESCRITURA

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
  v_punto jsonb;
  v_mapa jsonb := '{}'::jsonb;
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

  if not exists (
    select 1 from public.message_flows where id = p_flow_id and user_id = auth.uid()
  ) then
    raise exception 'el flujo % no existe o no es tuyo', p_flow_id;
  end if;

  /*
   * La deteccion se pide UNA vez y se guarda en un mapa por lead. Antes esta
   * funcion repetia la consulta dentro del bucle, con su propia copia de la
   * regla: dos definiciones de lo mismo que podian discrepar, y de hecho
   * discrepaban en cuanto una se corregia y la otra no.
   */
  if p_use_detection then
    select coalesce(
      jsonb_object_agg(
        rp.lead_id::text,
        jsonb_build_object('paso', rp.last_done_order, 'fecha', rp.last_sent_at)
      ),
      '{}'::jsonb
    )
    into v_mapa
    from public.flow_resume_points(p_flow_id) rp;
  end if;

  foreach v_lead in array p_lead_ids loop
    if p_use_detection then
      v_punto := v_mapa -> v_lead::text;
      v_last := coalesce((v_punto ->> 'paso')::integer, 0);
      v_base := (v_punto ->> 'fecha')::timestamptz;
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

COMMENT ON FUNCTION public.enroll_leads_in_flow(uuid, uuid[], boolean, integer) IS
  'Inscribe varios leads en un flujo de una vez, cada uno desde el paso que ya recibio segun flow_resume_points. Cada lead falla por su cuenta; devuelve las cuentas de inscritos, ya inscritos en el canal y fallidos.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Volver a las definiciones de la 158 (flow_resume_points) y la 160
--   (enroll_leads_in_flow).
