-- 059 - Relacion calculada internal_messages -> profiles_public
--
-- Complemento de la migracion 058. Al mover la lectura de perfiles ajenos a la
-- vista profiles_public, el embed de la comunidad dejo de resolverse:
--
--   PGRST200: Searched for a foreign key relationship between
--   'internal_messages' and 'profiles_public' ... but no matches were found.
--
-- Motivo: internal_messages tiene dos FK hacia profiles (sender_id y
-- receiver_id). PostgREST infiere relaciones hacia vistas, pero no hereda los
-- nombres de constraint, asi que con dos candidatas no puede desambiguar. El
-- caso de chat_messages si funciona porque tiene una sola FK.
--
-- En vez de volver a la tabla base (que reabriria la fuga) o de hacer una
-- consulta por mensaje (N+1), se declara una relacion calculada: una funcion
-- que recibe la fila y devuelve setof de la vista. PostgREST la expone como si
-- fuera un embed normal, con el nombre de la funcion.

create or replace function public.sender_profile(public.internal_messages)
returns setof public.profiles_public
rows 1
language sql
stable
as $fn$
  select pp.*
  from public.profiles_public pp
  where pp.id = $1.sender_id;
$fn$;

comment on function public.sender_profile(public.internal_messages) is
  'Relacion calculada para PostgREST: permite embeber el perfil publico del remitente sin exponer la tabla profiles.';

notify pgrst, 'reload schema';
