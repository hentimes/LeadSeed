-- telemetria_con_identidad_de_sesion
--
-- Tipo:           reemplazo de funcion (cambia la firma) + grant
-- Objeto:         public.increment_telemetry(...)
-- Clase:          correccion de un fallo de seguridad + correccion de un fallo
-- Persistencia:   permanente
-- Reversibilidad: total (volver a la firma de la 004 y sus grants)
--
-- DOS FALLOS EN LA MISMA FUNCION
--
-- (1) RECIBE LA IDENTIDAD EN VEZ DE MIRARLA
--
-- La firma de la 004 es:
--
--   increment_telemetry(p_user_id uuid, p_section text, p_seconds integer)
--
-- y es SECURITY DEFINER, o sea que la RLS de `user_telemetry` no la mira.
-- Quien pueda llamarla escribe telemetria a nombre de cualquier usuario: basta
-- con mandar otro uuid. Es el patron de confiar en lo que dice el cliente.
--
-- (2) NO LA PUEDE LLAMAR NADIE
--
-- Y a la vez -esto es lo que la vuelve interesante- la funcion esta muerta.
-- Los permisos de EXECUTE en Postgres son PUBLIC por defecto, y dos
-- migraciones se los fueron sacando sin devolverselos a nadie:
--
--   067: revoke execute ... from anon;
--   068: revoke execute ... from public;
--
-- Despues de la 068 no queda ningun rol con permiso. `authenticated` nunca
-- recibio un GRANT. Asi que cada cambio de pagina llama a la funcion, la
-- llamada falla con permiso denegado, y el error muere aqui:
--
--   trackPageTime(...).catch((error) => { console.error('Error telemetry:', error); });
--   -- apps/extension/src/hooks/useTelemetry.ts:19
--
-- El panel de administracion lee `user_telemetry` y muestra lo que haya, que
-- desde la 068 es lo que quedo congelado. Nadie se entero porque el unico
-- sintoma es un error en una consola que no se mira, y una tabla que no crece
-- se ve igual que una tabla de gente que no usa la aplicacion.
--
-- LA CORRECCION: SE VA EL SECURITY DEFINER
--
-- La 004 ya habia puesto las politicas correctas en la tabla:
--
--   INSERT ... WITH CHECK (auth.uid() = user_id)
--   UPDATE ... USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--
-- Con esas politicas, SECURITY DEFINER no aporta nada: solo apaga la defensa
-- que ya estaba escrita. Pasando la funcion a INVOKER -el valor por defecto-
-- la RLS vuelve a aplicar, y el parametro sobra: la identidad sale de
-- `auth.uid()`. Quedan dos barreras diciendo lo mismo, que es lo que se quiere.
--
-- CAMBIA LA FIRMA, ASI QUE HAY QUE BORRAR LA VIEJA
--
-- Quitar un parametro no es un reemplazo: `CREATE OR REPLACE` crearia una
-- segunda funcion y PostgREST no sabria cual llamar. Se borra la de tres
-- parametros. El cliente se actualiza en el mismo commit.

DROP FUNCTION IF EXISTS public.increment_telemetry(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.increment_telemetry(p_section text, p_seconds integer)
RETURNS void
LANGUAGE plpgsql
-- SECURITY INVOKER (el valor por defecto, se deja explicito porque el cambio
-- respecto de la 004 es justamente este): la RLS de la tabla vuelve a aplicar.
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Sin sesion no hay a quien contarle los segundos. Se sale en silencio en
  -- vez de fallar: es telemetria, no tiene por que romperle nada al usuario.
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Un cambio de pagina no puede durar negativo ni una eternidad. El tope
  -- corta el caso del portatil que estuvo dos dias suspendido con el panel
  -- abierto, que si no mete un solo registro de 170.000 segundos y arruina
  -- cualquier promedio.
  IF p_seconds IS NULL OR p_seconds <= 0 OR p_seconds > 14400 THEN
    RETURN;
  END IF;

  INSERT INTO public.user_telemetry (user_id, section, total_seconds, last_updated_at)
  VALUES (v_user_id, p_section, p_seconds, timezone('utc'::text, now()))
  ON CONFLICT (user_id, section) DO UPDATE
  SET
    total_seconds = public.user_telemetry.total_seconds + EXCLUDED.total_seconds,
    last_updated_at = EXCLUDED.last_updated_at;
END;
$$;

COMMENT ON FUNCTION public.increment_telemetry(text, integer) IS
  'Suma segundos de uso a la seccion indicada, para el usuario de la sesion. SECURITY INVOKER a proposito: la identidad sale de auth.uid() y la RLS de user_telemetry vuelve a aplicar. Antes recibia el user_id por parametro y era DEFINER, lo que permitia escribir a nombre de otro.';

-- El GRANT que faltaba desde la 068. Sin esto la funcion sigue muerta.
REVOKE ALL ON FUNCTION public.increment_telemetry(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.increment_telemetry(text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.increment_telemetry(text, integer);
--   y volver a la definicion de tres parametros de la 004.
--   Ojo: eso reintroduce los dos fallos, y ademas hay que revertir el cambio
--   de apps/extension/src/repositories/telemetryRepository.ts.
