-- reschedule_devuelve_a_pendiente_y_pausa_de_verdad
--
-- Tipo:           correccion de dos funciones
-- Objeto:         public.reschedule_flow_steps(jsonb), public.get_my_flow_dispatch_queue()
-- Clase:          correccion de un fallo
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la 162 y a la 109)
--
-- EL FALLO: REPARTIR NO REPARTIA NADA
--
-- La 162 mueve el `due_at` de los pasos que no caben en el cupo del dia, y
-- decidio a proposito no tocar `status`, con este razonamiento escrito en su
-- cabecera:
--
--   "Un paso que ya estaba en `toca` y se empuja al futuro vuelve a
--    `pendiente` solo cuando `promote_due_flow_steps` lo reevalue, que es quien
--    manda sobre ese estado."
--
-- Eso es falso, y basta con leer la 109 para verlo: `promote_due_flow_steps`
-- solo promueve `pendiente -> toca`. **Nada degrada nunca**. Y la cola
-- (`get_my_flow_dispatch_queue`) filtra por `status = 'toca'` sin mirar la
-- fecha.
--
-- O sea que un paso ya vencido que se empujaba cuatro dias seguia saliendo en
-- "Hoy" como si venciera ahora. El boton "Repartir" cambiaba la fecha en la
-- base y la lista se quedaba exactamente igual: la unica herramienta contra el
-- tope diario de WhatsApp no hacia nada visible.
--
-- LA CORRECCION, POR DOS LADOS
--
-- 1. Al reprogramar al futuro, el paso vuelve a `pendiente`. Es lo que la 162
--    creia que pasaba solo.
--
-- 2. La cola exige ademas que la fecha haya vencido de verdad. Es cinturon y
--    tirantes: cualquier otro camino que deje un `toca` con fecha futura -un
--    arreglo a mano, una migracion futura- deja de ensuciar la vista del dia.
--    El estado sigue siendo la señal principal; la fecha es la comprobacion.
--
-- Se tolera `due_at` nulo en la cola. No deberia existir un `toca` sin fecha
-- -la promocion la exige- pero si existiera, esconderlo lo volveria invisible
-- para siempre, y un paso que no se puede ver es peor que uno que aparece
-- antes de tiempo.
--
-- EL OTRO FALLO DE LA MISMA FAMILIA: PAUSAR NO PAUSABA
--
-- La cola tampoco miraba `message_flows.is_active`. Un flujo pausado seguia
-- poniendo sus pasos en "Hoy", con su boton de enviar encendido.
--
-- El detalle decia -y era literalmente cierto- "Pausado: no se puede inscribir
-- a nadie nuevo. Los que ya estan dentro conservan su progreso". Cierto y
-- enganoso en la unica direccion que importa: pausar es la maniobra estandar
-- para corregir un flujo sin romper a los inscritos, y si no frena los envios,
-- corregir un texto significa seguir mandando el texto viejo mientras lo
-- corregis.
--
-- `is_active` pasa a filtrar la cola. La inscripcion ya lo respetaba desde la
-- 109 (`enroll_lead_in_flow` falla con el flujo desactivado), asi que ahora las
-- dos puntas dicen lo mismo.
--
-- El progreso NO se toca al pausar: los pasos siguen venciendo por dentro y
-- reaparecen -con su atraso a cuestas- al reanudar. Congelarlos exigiria
-- recalcular todas las fechas al volver, y eso convierte una pausa de diez
-- minutos en un reordenamiento de la agenda entera.

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
      -- Al futuro vuelve a la sala de espera; si la fecha nueva ya vencio, se
      -- queda como estaba y `promote_due_flow_steps` decidira.
      status = case when c.due_at > now() then 'pendiente' else p.status end,
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

COMMENT ON FUNCTION public.reschedule_flow_steps(jsonb) IS
  'Mueve el due_at de varios pasos pendientes de una vez y devuelve a pendiente los que quedan en el futuro. No toca los ya registrados. Respeta RLS por SECURITY INVOKER.';

CREATE OR REPLACE FUNCTION public.get_my_flow_dispatch_queue()
RETURNS TABLE (
  progress_id bigint,
  enrollment_id bigint,
  lead_id uuid,
  lead_name text,
  lead_phone text,
  lead_email text,
  flow_id uuid,
  flow_name text,
  channel text,
  step_id bigint,
  step_order integer,
  template_id uuid,
  template_name text,
  due_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  perform public.promote_due_flow_steps();

  return query
  select
    p.id,
    p.enrollment_id,
    l.id,
    l.name,
    l.phone,
    l.email,
    f.id,
    f.name,
    f.channel,
    s.id,
    s.step_order,
    t.id,
    t.name,
    p.due_at
  from public.message_flow_progress p
  join public.message_flow_enrollments e on e.id = p.enrollment_id
  join public.message_flows f on f.id = e.flow_id
  join public.message_flow_steps s on s.id = p.step_id
  join public.templates t on t.id = s.template_id
  join public.leads l on l.id = e.lead_id
  where p.user_id = auth.uid()
    and p.status = 'toca'
    -- Ver la cabecera: la fecha comprueba al estado. Nulo se deja pasar para
    -- que un paso sin fecha no quede invisible para siempre.
    and (p.due_at is null or p.due_at <= now())
    and e.status = 'activa'
    -- Un flujo pausado no manda. Ver la cabecera.
    and f.is_active
    and l.deleted_at is null
  order by p.due_at asc, p.id asc;
end;
$$;

REVOKE ALL ON FUNCTION public.get_my_flow_dispatch_queue() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_flow_dispatch_queue() TO authenticated;

COMMENT ON FUNCTION public.get_my_flow_dispatch_queue() IS
  'Que falta enviar hoy: promueve pendiente->toca y devuelve la cola propia ya vencida de flujos activos, mas vieja primero.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Volver a las definiciones de la 162 (reschedule_flow_steps) y la 109
--   (get_my_flow_dispatch_queue).
