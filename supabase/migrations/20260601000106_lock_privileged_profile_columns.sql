-- 065 - Cerrar la escalacion de privilegios en profiles
--
-- Auditoria de seguridad, hallazgo critico 1, confirmado en produccion: con
-- una sesion de vendedor se ejecuto
--   UPDATE profiles SET role = 'admin' WHERE id = auth.uid()
-- y funciono. La policy "Users can update own profile" solo valida
-- auth.uid() = id, que es correcto para decidir DE QUIEN es la fila, pero
-- RLS no puede restringir QUE COLUMNAS se cambian dentro de esa fila. Eso
-- solo se puede hacer con un trigger.
--
-- Columnas que se congelan para todo el que no sea admin:
--   role, is_helper, capture_links_limit, badges,
--   gateway_customer_id, subscription_id, subscription_status, subscription_end_date
--
-- plan_id es un caso aparte. App.tsx bloquea al usuario en la pantalla de
-- onboarding hasta que profiles.plan_id no sea null, y handle_new_user no le
-- asigna ningun plan por defecto al crear la cuenta: bloquearlo sin
-- excepcion habria dejado a todo usuario nuevo atrapado ahi para siempre,
-- porque no existe ningun flujo de admin que lo complete por el.
-- Se permite entonces la primera asignacion (OLD.plan_id IS NULL, que es el
-- propio onboarding) pero una vez fijado, solo un admin puede reasignarlo.
-- Eso cierra el escenario real de escalacion -reasignarse un plan mejor mas
-- adelante- sin romper el alta de cuentas.
--
-- No se elige security_invoker en el trigger: la funcion is_current_profile_admin()
-- ya es SECURITY DEFINER (migracion 058) y resuelve la consulta a profiles
-- sin reentrar en esta misma politica.

create or replace function public.enforce_profile_privilege_columns()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  -- Un admin puede cambiar cualquier columna de cualquier fila. Es la misma
  -- via que ya usa el panel de administracion (adminRepository, AdminUsersPage).
  if public.is_current_profile_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'No autorizado para cambiar el rol del perfil';
  end if;

  if new.is_helper is distinct from old.is_helper then
    raise exception 'No autorizado para cambiar el estado de ayudante';
  end if;

  if new.capture_links_limit is distinct from old.capture_links_limit then
    raise exception 'No autorizado para cambiar el limite de links de captura';
  end if;

  if new.badges is distinct from old.badges then
    raise exception 'No autorizado para cambiar las insignias del perfil';
  end if;

  if new.gateway_customer_id is distinct from old.gateway_customer_id then
    raise exception 'No autorizado para cambiar el cliente de la pasarela de pago';
  end if;

  if new.subscription_id is distinct from old.subscription_id then
    raise exception 'No autorizado para cambiar la suscripcion';
  end if;

  if new.subscription_status is distinct from old.subscription_status then
    raise exception 'No autorizado para cambiar el estado de la suscripcion';
  end if;

  if new.subscription_end_date is distinct from old.subscription_end_date then
    raise exception 'No autorizado para cambiar la vigencia de la suscripcion';
  end if;

  if new.plan_id is distinct from old.plan_id then
    if old.plan_id is not null then
      raise exception 'No autorizado para cambiar el plan asignado';
    end if;
    -- old.plan_id era null: es la asignacion inicial del onboarding, se permite.
  end if;

  return new;
end;
$fn$;

comment on function public.enforce_profile_privilege_columns() is
  'Bloquea que un usuario no-admin cambie columnas administrativas de su propia fila. RLS solo filtra filas, no columnas: esto es lo que faltaba.';

drop trigger if exists profiles_enforce_privilege_columns on public.profiles;
create trigger profiles_enforce_privilege_columns
  before update on public.profiles
  for each row
  execute function public.enforce_profile_privilege_columns();
