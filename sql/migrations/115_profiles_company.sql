-- 115 - Empresa en el perfil
--
-- Campo libre, no catalogo: no hay ninguna tabla de empresas ni hace falta
-- inventarla para mostrar "trabaja en X" junto al nombre. Si algun dia se quiere
-- agrupar usuarios por empresa, entonces si tocara normalizarlo, pero hacerlo
-- ahora seria construir un catalogo entero para rellenar una linea de texto.
--
-- Se expone tambien en profiles_public porque es informacion de presentacion,
-- del mismo tipo que bio: la ve quien te lee en el chat o en la comunidad. La
-- tabla base sigue cerrada -solo tu fila, o cualquiera si eres admin, desde la
-- migracion 058- y la vista sigue sin exponer email ni datos de facturacion.

alter table public.profiles
add column if not exists company text;

comment on column public.profiles.company is
  'Empresa donde trabaja el usuario. Texto libre, sin catalogo.';

-- La vista se recrea con la columna al final. profiles_public no lleva
-- security_invoker a proposito (ver migracion 058): se evalua con los permisos
-- de su dueño y por eso expone un subconjunto seguro sin abrir la tabla base.
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
  p.is_helper,
  p.company
from public.profiles p;

comment on view public.profiles_public is
  'Campos no sensibles de profiles. Se usa para chat, comunidad y soporte, que necesitan leer otros usuarios sin acceder a email ni a datos de facturacion.';

revoke all on public.profiles_public from anon;
grant select on public.profiles_public to authenticated;

notify pgrst, 'reload schema';
