-- 111 - Saber con que proveedores entra el usuario actual
--
-- Contexto: al abrir el alta con email + contraseña hay que poder decirle a
-- alguien "esta cuenta se creo con Google, entra por ahi". profiles no guarda el
-- proveedor; solo auth.identities lo sabe, y esa tabla no es legible desde el
-- rol authenticated.
--
-- Por que NO recibe el correo como parametro:
--
-- El diseño original pasaba un email y devolvia sus proveedores. Eso es un
-- oraculo de enumeracion: cualquiera con la anon key -que viaja publica dentro
-- del bundle de la extension- podria recorrer direcciones y averiguar cuales
-- existen y como entran. Supabase ademas no aplica rate limit a las RPC.
--
-- No hace falta. El unico momento en que se muestra el aviso es DESPUES de
-- verificar el codigo OTP, y para entonces el usuario ya tiene sesion sobre esa
-- cuenta: probo ser el dueño del correo. Mirando auth.uid() se obtiene lo mismo
-- sin aceptar ningun dato del llamador, asi que no hay nada que enumerar.
--
-- Regla de lectura del resultado: la cuenta es "solo Google" si el array trae
-- 'google' y NO trae 'email'. Una cuenta puede tener las dos identidades (en
-- este proyecto ya hay una asi), y esa si tiene contraseña propia.

create or replace function public.current_user_auth_providers()
returns text[]
language sql
stable
security definer
set search_path = auth, public
as $fn$
  select coalesce(array_agg(distinct i.provider order by i.provider), '{}'::text[])
  from auth.identities i
  where i.user_id = auth.uid();
$fn$;

comment on function public.current_user_auth_providers() is
  'Proveedores de autenticacion del usuario actual (google, email, ...). No recibe parametros a proposito: leer auth.uid() en vez de un correo evita convertirla en un oraculo de enumeracion de cuentas.';

-- anon queda fuera: sin sesion no hay nada que consultar, y concederselo seria
-- justamente reabrir el agujero que el diseño evita.
revoke all on function public.current_user_auth_providers() from public, anon;
grant execute on function public.current_user_auth_providers() to authenticated;

notify pgrst, 'reload schema';
