-- tarea_diaria_de_envios
--
-- Tipo:           columnas nuevas + funcion nueva
-- Objeto:         public.profiles, public.ensure_daily_send_task(...)
-- Clase:          funcionalidad nueva
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion y de las dos columnas)
--
-- QUE SE AÑADE
--
-- Una tarea que aparece sola cada dia: "Enviar mensajes de hoy", con cuantos
-- pasos de flujo hay pendientes. No existia nada parecido -se busco
-- automatizacion de tareas en el cliente y en las 175 migraciones y no habia
-- absolutamente nada-, asi que esto es funcionalidad, no una correccion.
--
-- POR QUE UNA FUNCION Y NO UN INSERT DESDE EL CLIENTE
--
-- Por las dos cosas que un insert suelto hace mal:
--
-- 1. DUPLICADOS. El disparador es abrir el panel, y el panel se puede abrir en
--    dos ventanas a la vez. Dos clientes comprobando "¿ya existe la de hoy?" y
--    despues insertando se pisan y crean dos. Aqui la comprobacion y el insert
--    van en la misma sentencia.
--
-- 2. RESPETAR EL BORRADO. Si la marca de "ya se creo" fuera "existe una tarea
--    con este titulo hoy", borrar la tarea la haria volver a aparecer al
--    siguiente refresco. Por eso la marca es una FECHA en el perfil y no la
--    existencia de la fila: se crea una vez por dia, y lo que hagas con ella
--    despues -completarla, editarla, borrarla- es cosa tuya.
--
-- EL APAGADO ES SUYO, NO DEL TOPE
--
-- `daily_send_task_enabled` es una columna aparte y no se deduce de
-- `whatsapp_daily_limit`. Son dos ideas distintas: el tope dice cuantos
-- mensajes es prudente mandar; esto dice si quieres que te lo recuerden. Quien
-- manda 200 al dia sin tope puede querer el recordatorio igual, y quien
-- respeta el tope puede no querer una tarea mas en el tablero.
--
-- EL DIA LO MANDA EL CLIENTE
--
-- Igual que en `get_my_dashboard_snapshot`: el dia se corta en la zona de
-- quien mira, no en UTC. Quien abre el panel a las 21:30 en Santiago no quiere
-- que se le cree la tarea de mañana.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_send_task_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_send_task_last_date date;

COMMENT ON COLUMN public.profiles.daily_send_task_enabled IS
  'Si se crea sola la tarea diaria de envios. Independiente de whatsapp_daily_limit: uno es un tope, esto es un recordatorio.';

COMMENT ON COLUMN public.profiles.daily_send_task_last_date IS
  'Ultimo dia (en la zona del usuario) para el que se creo la tarea diaria. Es la marca anti-duplicados, y esta aqui y no en la tabla de tareas para que borrar la tarea no la haga volver.';

CREATE OR REPLACE FUNCTION public.ensure_daily_send_task(
  p_hoy date,
  p_pendientes integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_activa boolean;
  v_ultimo date;
  v_titulo text;
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('creada', false, 'motivo', 'sin sesion');
  END IF;

  /*
   * El bloqueo de fila es lo que evita el duplicado: dos ventanas abriendo el
   * panel a la vez llegan aqui, una espera a la otra, y la segunda ya lee la
   * fecha de hoy escrita por la primera.
   */
  SELECT daily_send_task_enabled, daily_send_task_last_date
    INTO v_activa, v_ultimo
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('creada', false, 'motivo', 'sin perfil');
  END IF;

  IF NOT coalesce(v_activa, true) THEN
    RETURN jsonb_build_object('creada', false, 'motivo', 'apagada');
  END IF;

  IF v_ultimo IS NOT NULL AND v_ultimo >= p_hoy THEN
    RETURN jsonb_build_object('creada', false, 'motivo', 'ya existe');
  END IF;

  -- El numero va en el titulo porque es lo unico que se ve en el tablero sin
  -- abrir la tarjeta. Sin pendientes se dice igual: cero tambien es informacion
  -- -significa que hoy no toca nada de flujos- y evita que la tarea parezca
  -- rota cuando no hay cola.
  v_titulo := CASE
    WHEN coalesce(p_pendientes, 0) > 0
      THEN format('Enviar mensajes de hoy — %s pendientes de flujos', p_pendientes)
    ELSE 'Enviar mensajes de hoy'
  END;

  INSERT INTO public.tasks (user_id, title, description, status, due_date, is_important)
  VALUES (
    v_user_id,
    v_titulo,
    'Se crea sola cada día. Se puede apagar en Ajustes → General.',
    'pendiente',
    -- Vence al final del dia local, no a medianoche UTC: si venciera en UTC,
    -- en Santiago apareceria como atrasada a las 21:00 del mismo dia.
    (p_hoy + 1)::timestamptz - interval '1 second',
    false
  )
  RETURNING id INTO v_id;

  UPDATE public.profiles
  SET daily_send_task_last_date = p_hoy
  WHERE id = v_user_id;

  RETURN jsonb_build_object('creada', true, 'id', v_id, 'titulo', v_titulo);
END;
$$;

COMMENT ON FUNCTION public.ensure_daily_send_task(date, integer) IS
  'Crea la tarea diaria de envios si toca. Idempotente por dia: la marca es profiles.daily_send_task_last_date, no la existencia de la tarea, para que borrarla no la haga volver.';

REVOKE ALL ON FUNCTION public.ensure_daily_send_task(date, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_daily_send_task(date, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.ensure_daily_send_task(date, integer);
--   alter table public.profiles drop column if exists daily_send_task_enabled;
--   alter table public.profiles drop column if exists daily_send_task_last_date;
