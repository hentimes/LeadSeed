-- conteo_de_reportes_solo_para_staff
--
-- Tipo:           correccion de una funcion
-- Objeto:         public.count_pending_chat_reports()
-- Clase:          correccion de un fallo de seguridad
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la definicion de la 080)
--
-- EL FALLO: LA FUNCION SALTEA SU PROPIA POLITICA
--
-- `chat_message_reports` esta restringida a admin y helper por la politica
-- que la 080 define treinta lineas mas arriba de esta funcion:
--
--   exists (select 1 from public.profiles p
--           where p.id = auth.uid()
--             and (p.role = 'admin' or coalesce(p.is_helper, false) = true))
--
-- La funcion es SECURITY DEFINER, o sea que corre con los permisos de quien
-- la definio y la politica no la mira. Y esta concedida a `authenticated`
-- entera:
--
--   REVOKE ALL ON FUNCTION public.count_pending_chat_reports() FROM public, anon;
--   GRANT EXECUTE ON FUNCTION public.count_pending_chat_reports() TO authenticated;
--
-- Resultado: cualquier usuario con sesion obtiene el conteo de reportes
-- pendientes de moderacion. Es un solo numero, no el contenido, asi que el
-- daño es chico. Pero es un salto de RLS, y el numero no es inocuo: dice
-- cuanta gente esta denunciando mensajes en este momento, que es justo lo que
-- no quieres que sepa el que los esta escribiendo.
--
-- POR QUE NO SE CORRIGE EN EL GRANT
--
-- Quitarle el GRANT a `authenticated` obligaria a mantener una lista de a
-- quien darselo, y el rol de helper se asigna en `profiles`, no en Postgres:
-- no hay un rol de base de datos "staff" al que conceder. La comprobacion
-- tiene que estar dentro de la funcion, que es donde vive el dato.
--
-- POR QUE DEVUELVE 0 Y NO UN ERROR
--
-- El cliente ya trata el error como cero:
--
--   if (error || typeof data !== 'number') return 0;
--   -- apps/extension/src/repositories/chatModerationRepository.ts:118
--
-- Asi que devolver 0 al que no es staff da exactamente el comportamiento que
-- el front ya espera -no se pinta el distintivo- sin tener que tocarlo, y sin
-- llenar los registros de excepciones por algo que no es un error sino la
-- respuesta correcta a quien no tiene por que ver el dato.

CREATE OR REPLACE FUNCTION public.count_pending_chat_reports()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- `is_current_profile_staff()` es el mismo predicado que la politica de la
  -- tabla, ya definido en la 024. Se reutiliza en vez de repetirlo para que
  -- cambiar quien es staff siga siendo un solo lugar.
  SELECT CASE
    WHEN public.is_current_profile_staff()
      THEN (SELECT count(*)::integer FROM public.chat_message_reports WHERE status = 'pending')
    ELSE 0
  END;
$$;

COMMENT ON FUNCTION public.count_pending_chat_reports() IS
  'Cuenta los reportes de chat pendientes. Devuelve 0 a quien no es admin ni helper: es SECURITY DEFINER y la politica de la tabla no la alcanza, asi que la comprobacion va adentro.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Volver al cuerpo de la 080:
--   SELECT count(*)::integer FROM public.chat_message_reports WHERE status = 'pending';
