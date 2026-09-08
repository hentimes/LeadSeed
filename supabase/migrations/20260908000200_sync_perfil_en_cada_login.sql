-- sync_perfil_en_cada_login
--
-- Tipo:           trigger nuevo + correccion de funcion + relleno
-- Objeto:         public.handle_new_user(), trigger on_auth_user_updated, public.profiles
-- Clase:          correccion de un fallo
-- Persistencia:   permanente
-- Reversibilidad: total (drop del trigger nuevo y volver a la 003)
--
-- EL FALLO: UNA CUENTA DE GOOGLE SIN NOMBRE NI FOTO
--
-- En el chat aparecia como "Usuario" con la inicial en vez de la foto, y en el
-- panel de administracion solo con el correo. La cuenta entra con Google y
-- Google manda nombre y foto, asi que el dato existe: lo que fallaba es donde
-- se guarda.
--
-- LA CAUSA
--
-- La 003 copia el nombre y la foto desde `raw_user_meta_data` a `profiles`, y
-- lo hace con un trigger **AFTER INSERT ON auth.users**. Solo al crear la fila.
--
-- Eso alcanza cuando la primera vez que alguien aparece ya viene por Google.
-- No alcanza en el camino que este producto usa de verdad: la cuenta se crea
-- primero con correo y clave -o por invitacion-, y Google se vincula despues.
-- Entonces los datos de Google llegan en un **UPDATE** de `auth.users`, no en
-- un INSERT, y no habia ningun trigger escuchando ese update. El perfil se
-- quedaba con el nombre en nulo para siempre, y ningun login posterior lo
-- arreglaba porque nadie mas escribe esas dos columnas: el cliente no las toca.
--
-- POR QUE SE VE EN UNAS PANTALLAS Y EN OTRAS NO
--
-- Las pantallas que muestran al usuario a SI MISMO -la cabecera, el menu, la
-- ficha- disimulan el agujero cayendo a `user.user_metadata`, que si tiene los
-- datos de Google. El chat y el panel de administracion muestran a OTROS
-- usuarios, y de otros solo se puede leer `profiles`. Por eso el mismo usuario
-- se ve con foto arriba a la derecha y como "Usuario" en el chat.
--
-- LA CORRECCION
--
-- 1. Un trigger en el UPDATE de `raw_user_meta_data`, para que cada login que
--    traiga datos nuevos los deje en el perfil.
-- 2. Se aceptan tambien las claves `name` y `picture`. Supabase suele mapear
--    Google a `full_name` y `avatar_url`, pero no siempre: los reclamos OIDC de
--    Google se llaman `name` y `picture`, y segun el proveedor y la version
--    llega uno, el otro o los dos.
-- 3. Un relleno de una sola vez para las cuentas que ya estan asi.
--
-- EL UPDATE SOLO RELLENA HUECOS, NO PISA
--
-- Al crear el perfil se toma lo que venga de Google, que es lo unico que hay.
-- En los updates posteriores solo se escribe si la columna esta en NULO: si
-- alguien se cambio el nombre en la aplicacion, volver a entrar con Google no
-- tiene por que devolverselo al que dice Google. El dato de Google es el
-- respaldo, no la autoridad.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre text := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );
  v_foto text := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, v_nombre, v_foto)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    -- Solo rellena huecos: ver la cabecera. `profiles.full_name` manda si ya
    -- tiene algo, porque puede haberlo puesto la persona a mano.
    full_name = coalesce(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, EXCLUDED.avatar_url);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- El que faltaba: los datos de Google llegan aqui cuando la cuenta ya existia.
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF raw_user_meta_data ON auth.users
FOR EACH ROW
WHEN (new.raw_user_meta_data IS DISTINCT FROM old.raw_user_meta_data)
EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Copia correo, nombre y foto de auth.users a profiles, al crear la cuenta y cada vez que cambian sus metadatos. Acepta las claves de Supabase (full_name, avatar_url) y las de Google (name, picture). En los updates solo rellena columnas nulas.';

-- ------------------------------------------------ RELLENO DE UNA SOLA VEZ
--
-- Las cuentas que ya quedaron sin nombre o sin foto. Toca solo las columnas
-- vacias, por el mismo motivo de arriba.

UPDATE public.profiles p
SET
  full_name = coalesce(
    p.full_name,
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ),
  avatar_url = coalesce(
    p.avatar_url,
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
WHERE u.id = p.id
  AND (p.full_name IS NULL OR p.avatar_url IS NULL);

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop trigger if exists on_auth_user_updated on auth.users;
--   y volver a la definicion de handle_new_user de la 003.
