-- 058 - Restringir la lectura de perfiles ajenos
--
-- Hallazgo de la auditoria de RLS: la politica "Authenticated users can read
-- profiles" era (auth.role() = 'authenticated'), asi que cualquier usuario
-- logueado podia leer la fila completa de todos los demas: email,
-- gateway_customer_id, subscription_id, subscription_status y
-- subscription_end_date incluidos. Como la anon key viaja publica dentro del
-- bundle de la extension, bastaba una cuenta cualquiera para extraerlo todo.
--
-- No se puede simplemente cerrar la tabla: chat, comunidad y soporte necesitan
-- leer datos de otros usuarios (nombre, avatar, marco premium, quien es admin).
-- Por eso se separa en dos superficies:
--
--   profiles         -> solo la propia fila, o cualquiera si sos admin.
--   profiles_public  -> vista con los campos no sensibles, para todos.
--
-- La vista NO lleva security_invoker, asi que se evalua con los permisos de su
-- dueño y no vuelve a aplicar la RLS de profiles. Ese es justamente el punto:
-- expone un subconjunto seguro sin abrir la tabla base.

-- ---------------------------------------------------------------------------
-- Superficie publica
-- ---------------------------------------------------------------------------
create or replace view public.profiles_public as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.role,
  p.bio,
  p.badges,
  p.show_premium_frame,
  p.last_seen_at,
  p.is_invisible,
  p.is_helper
from public.profiles p;

comment on view public.profiles_public is
  'Campos no sensibles de profiles. Se usa para chat, comunidad y soporte, que necesitan leer otros usuarios sin acceder a email ni a datos de facturacion.';

revoke all on public.profiles_public from anon;
grant select on public.profiles_public to authenticated;

-- ---------------------------------------------------------------------------
-- Helper de admin
-- ---------------------------------------------------------------------------
-- Tiene que ser SECURITY DEFINER: una politica SELECT sobre profiles que
-- consulte profiles dentro del using() provoca "infinite recursion detected in
-- policy for relation profiles". La funcion corre con los permisos de su dueño
-- y no reentra en la RLS.
--
-- Existe is_current_profile_staff(), pero incluye a los helpers. Para la fila
-- completa, que trae email y datos de facturacion, se exige admin estricto.
create or replace function public.is_current_profile_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$fn$;

comment on function public.is_current_profile_admin() is
  'True si el usuario actual es admin. SECURITY DEFINER para poder usarse dentro de politicas RLS de profiles sin recursion.';

-- ---------------------------------------------------------------------------
-- Cerrar la tabla base
-- ---------------------------------------------------------------------------
-- "Usuario lee su perfil" (auth.uid() = id) ya existe y se conserva. Solo se
-- reemplaza la politica abierta por su equivalente restringido a admin.
drop policy if exists "Authenticated users can read profiles" on public.profiles;

create policy "Admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_current_profile_admin());
