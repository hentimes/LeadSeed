-- Query permanente
-- Dominio: planespro_agenda / cierre de citas
-- Objeto: public.close_my_appointment(uuid, boolean, text, boolean, jsonb)
-- Clase: funcion
-- Descripcion: cierra una cita y crea su nota y sus tareas en una sola transaccion
-- Proposito: que un fallo a mitad no deje la reunion cerrada con el seguimiento sin crear
-- Dependencias: 139 (record_my_appointment_outcome), 006 (lead_notes), 000 (tasks)
-- Impacto: sustituye tres llamadas encadenadas del cliente por una
-- Persistencia: permanente
--
-- POR QUE
--
-- Cerrar una reunion escribe en tres sitios: el estado y la minuta de la cita,
-- una nota en la ficha del lead, y una tarea por cada seguimiento pedido. El
-- cliente las hacia en tres llamadas seguidas, la cita primero, para que un
-- fallo no dejara notas y tareas colgando de una reunion que el sistema
-- siguiera dando por sin registrar.
--
-- Ese orden evita la basura huerfana y crea el problema opuesto, que es el que
-- señalo la revision automatica del PR #1: si la cita se cierra y despues falla
-- la nota o una tarea, la cita YA quedo cerrada mientras la pantalla informa de
-- un fallo. Y no hay forma de terminar el trabajo: al cerrarse, la cita sale de
-- "Por registrar", asi que no se puede volver a intentar. Un fallo a mitad del
-- bucle de tareas dejaba ademas unas creadas y otras no.
--
-- Aca las tres cosas ocurren en la misma transaccion. Si algo falla no se
-- guarda nada, la cita sigue pendiente de registrar y reintentar es
-- exactamente igual que la primera vez.
--
-- ## Que NO hace
--
-- No sincroniza con Google Calendar. Eso vive fuera de la base y no puede
-- entrar en la transaccion; ademas el cierre no cambia el evento, solo cuenta
-- como fue.
--
-- No sustituye a `record_my_appointment_outcome` de la 139: esa sigue siendo
-- quien valida y escribe el cierre, y esta la llama. Duplicar sus reglas -que
-- la cita haya terminado, que no este cancelada- en dos sitios seria pedir que
-- se separaran.
--
-- ## Las tareas llegan como jsonb
--
-- Un array de objetos `{title, dueDate}`. Se prefiere a dos arrays paralelos
-- de texto y fecha porque un desajuste de longitudes entre ellos seria un error
-- silencioso: la tarea equivocada con el vencimiento de otra.
--
-- REVERSION
--
--   DROP FUNCTION IF EXISTS public.close_my_appointment(uuid, boolean, text, boolean, jsonb);
--   El cliente vuelve a las tres llamadas encadenadas.

CREATE OR REPLACE FUNCTION public.close_my_appointment(
  p_appointment_id uuid,
  p_attended boolean,
  p_outcome_notes text DEFAULT NULL,
  p_also_lead_note boolean DEFAULT false,
  p_tasks jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  appointment_id uuid,
  status text,
  outcome_recorded_at timestamptz,
  note_created boolean,
  tasks_created integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cita record;
  v_minuta text := nullif(trim(coalesce(p_outcome_notes, '')), '');
  v_nota_creada boolean := false;
  v_tareas integer := 0;
  v_tarea jsonb;
  v_titulo text;
  v_vence timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- El cierre y sus validaciones siguen viviendo en la funcion de la 139.
  SELECT o.id, o.lead_id, o.lead_name, o.status, o.outcome_recorded_at
  INTO v_cita
  FROM public.record_my_appointment_outcome(p_appointment_id, p_attended, v_minuta) o;

  IF v_minuta IS NOT NULL AND p_also_lead_note AND v_cita.lead_id IS NOT NULL THEN
    INSERT INTO public.lead_notes (lead_id, user_id, content)
    VALUES (v_cita.lead_id, v_user_id, v_minuta);
    v_nota_creada := true;
  END IF;

  FOR v_tarea IN SELECT * FROM jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb))
  LOOP
    v_titulo := nullif(trim(coalesce(v_tarea ->> 'title', '')), '');
    CONTINUE WHEN v_titulo IS NULL;

    -- Una fecha ilegible no aborta el cierre: la tarea nace sin vencimiento,
    -- que es un estado valido, en vez de perderse.
    BEGIN
      v_vence := (v_tarea ->> 'dueDate')::timestamptz;
    EXCEPTION WHEN others THEN
      v_vence := NULL;
    END;

    INSERT INTO public.tasks (title, description, lead_id, lead_list_ids, due_date, status, user_id, created_at)
    VALUES (
      v_titulo,
      'Seguimiento de la reunión con ' || coalesce(v_cita.lead_name, 'el lead'),
      v_cita.lead_id,
      '{}',
      v_vence,
      'pendiente',
      v_user_id,
      timezone('utc'::text, now())
    );

    v_tareas := v_tareas + 1;
  END LOOP;

  RETURN QUERY SELECT v_cita.id, v_cita.status, v_cita.outcome_recorded_at, v_nota_creada, v_tareas;
END;
$$;

COMMENT ON FUNCTION public.close_my_appointment(uuid, boolean, text, boolean, jsonb) IS
  'Cierra una cita propia y crea su nota y sus tareas de seguimiento en una sola transaccion: un fallo no deja la reunion cerrada con el seguimiento a medias.';

REVOKE ALL ON FUNCTION public.close_my_appointment(uuid, boolean, text, boolean, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.close_my_appointment(uuid, boolean, text, boolean, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.close_my_appointment(uuid, boolean, text, boolean, jsonb) TO authenticated;
