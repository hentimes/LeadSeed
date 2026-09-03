-- 114 - Saber si el usuario actual tiene contrasena de verdad
--
-- Corrige una suposicion equivocada de la migracion 111. Alli se dedujo "tiene
-- contrasena" de que existiera una identidad de proveedor 'email' en
-- auth.identities. Una prueba contra el servidor demostro que no se sostiene:
--
--   1. Un usuario creado por la Admin API SIN contrasena nace igualmente con
--      identidad 'email'. La identidad existe, la contrasena no.
--   2. `updateUser({password})` NO toca auth.identities. Un usuario que solo
--      entraba con Google y se pone contrasena conserva sus identidades tal
--      cual: sigue figurando solo 'google'.
--
-- Con la deduccion vieja pasaban dos cosas, ninguna evidente:
--
--   - Quien se pusiera contrasena desde su perfil seguiria viendo "anadir una
--     contrasena", como si no hubiera hecho nada.
--   - Y si luego la olvidaba, la recuperacion se la negaba por "esta cuenta usa
--     Google", dejandolo sin salida pese a tener contrasena.
--
-- La fuente de verdad es auth.users.encrypted_password. auth.identities sirve
-- para saber COMO entra (Google, correo), no para saber SI tiene contrasena; son
-- dos preguntas distintas y hasta ahora se respondian con el mismo dato.
--
-- Se devuelve un booleano y nunca el hash, por motivos que no hace falta
-- explicar.

create or replace function public.current_user_has_password()
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $fn$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.encrypted_password is not null
      and u.encrypted_password <> ''
  );
$fn$;

comment on function public.current_user_has_password() is
  'True si el usuario actual tiene contrasena propia. Mira auth.users.encrypted_password, no auth.identities: una identidad de correo puede existir sin contrasena, y poner una contrasena no crea identidad.';

-- anon por nombre, no solo via public: Supabase concede execute a anon por
-- privilegios por defecto en cada funcion nueva del esquema public, y ese grant
-- explicito sobrevive al revoke de public.
revoke all on function public.current_user_has_password() from public, anon;
grant execute on function public.current_user_has_password() to authenticated;

notify pgrst, 'reload schema';
