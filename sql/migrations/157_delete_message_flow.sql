-- delete_message_flow
--
-- Tipo:           funcion nueva
-- Objeto:         public.delete_message_flow(uuid)
-- Clase:          escritura destructiva, a pedido explicito del usuario
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la funcion; no cambia ninguna tabla)
--
-- PROPOSITO
--
-- Sacar a un flujo del callejon sin salida en el que lo deja su propio esquema.
--
-- EL CALLEJON
--
-- La 108 puso dos `on delete restrict`, cada uno razonable por separado:
--
--   message_flow_steps.template_id    -> templates(id)
--   message_flow_progress.step_id     -> message_flow_steps(id)
--
-- Encadenados dan un bloqueo del que no se sale desde la aplicacion. En cuanto
-- UN lead se inscribe y genera una fila de progreso:
--
--   1. El paso no se puede borrar, porque el progreso lo retiene.
--   2. El flujo no se puede editar, porque guardar borra los pasos y los
--      reinserta -es la unica forma de reordenar con `unique(flow_id,
--      step_order)`-, y ese borrado choca con lo anterior.
--   3. El flujo no se puede borrar. Y este es el que sorprende: al borrarlo,
--      la cascada SI borraria el progreso (via inscripciones), pero Postgres
--      comprueba `restrict` de inmediato, sin esperar a que las otras cascadas
--      del mismo comando limpien las filas que estorban. Con `no action` -que
--      se comprueba al final del comando- el borrado habria pasado.
--   4. Y como el paso no se puede borrar, sus plantillas tampoco.
--
-- Resultado: la definicion de un flujo con un solo inscrito queda congelada
-- para siempre, y sus plantillas se vuelven imborrables. La unica salida que
-- ofrecia la aplicacion era pausarlo, que no desbloquea nada de lo anterior.
--
-- QUE SE PIERDE Y QUE NO
--
-- Se pierden las inscripciones y su progreso: quien estaba en el flujo y por
-- que paso iba.
--
-- NO se pierde ningun envio. Lo dice la propia 108 en el comentario de
-- `message_flow_progress.send_log_id`: "Apunta al registro de envio en vez de
-- copiarlo: send_logs sigue siendo el unico registro de lo que se mando".
-- `send_logs` no se toca aca, ni tiene ninguna clave que apunte al progreso.
--
-- Por eso el `restrict` de la 108, leido hoy, protegia menos de lo que parecia:
-- no cuidaba el historial de mensajes -que vive en otra tabla- sino el rastro
-- de la inscripcion. Que ese rastro valga menos que poder corregir un flujo es
-- una decision del producto, y por eso esto es una funcion aparte que hay que
-- llamar a proposito, y no un cambio de las claves foraneas: borrar un flujo
-- sigue estando prohibido por accidente.
--
-- SEGURIDAD
--
-- `SECURITY INVOKER`: corre con el rol de quien llama, asi que las politicas
-- `_delete_own` de la 108 -que ya limitan a `auth.uid() = user_id` en las
-- cuatro tablas- filtran solas. Un usuario no puede borrar el flujo de otro ni
-- pasandole el id: el `delete` no encuentra la fila.
--
-- El cuerpo va en una sola funcion y no en dos llamadas desde el cliente porque
-- tiene que ser atomico: entre borrar las inscripciones y borrar el flujo no
-- puede quedar un flujo sin inscritos si lo segundo falla.

CREATE OR REPLACE FUNCTION public.delete_message_flow(p_flow_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  borrados integer;
BEGIN
  -- Primero las inscripciones. El progreso se va con ellas por la cascada de
  -- `message_flow_progress.enrollment_id`, y asi los pasos quedan libres.
  DELETE FROM public.message_flow_enrollments WHERE flow_id = p_flow_id;

  -- Ahora si: el flujo arrastra sus pasos y ya nada los retiene.
  DELETE FROM public.message_flows WHERE id = p_flow_id;
  GET DIAGNOSTICS borrados = ROW_COUNT;

  -- Cero significa que no existe o que no es de quien llama -RLS no distingue
  -- una cosa de la otra a proposito-. Quien llama decide como contarlo.
  RETURN borrados;
END;
$$;

COMMENT ON FUNCTION public.delete_message_flow(uuid) IS
  'Borra un flujo junto con sus inscripciones y su progreso, en una transaccion. No toca send_logs: el historial de lo enviado se conserva. Respeta RLS por SECURITY INVOKER.';

GRANT EXECUTE ON FUNCTION public.delete_message_flow(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.delete_message_flow(uuid);
