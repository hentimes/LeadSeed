-- 110 - Exigir correo confirmado para escribir contenido publico
--
-- Contexto: hasta ahora la unica forma de obtener una sesion era el consentimiento
-- OAuth de Google, que filtra de facto las cuentas desechables. Al abrir el alta
-- con email + contraseña esa barrera desaparece: cualquiera puede llamar a
-- signUp() con un correo inventado o ajeno.
--
-- Las politicas de escritura de chat y comunidad solo comprueban que el autor
-- sea el propio usuario (auth.uid() = author_id), nunca si su correo esta
-- confirmado. El flujo nuevo evita el problema en origen -no se emite sesion
-- hasta verifyOtp-, pero eso depende de un ajuste del panel de Supabase
-- (enable_confirmations). Si alguien lo desactiva por error, la base de datos
-- se queda sin defensa. Esta migracion es esa segunda linea.
--
-- Alcance deliberado: SOLO contenido publico, es decir lo que otros usuarios
-- llegan a ver. Lo estrictamente privado (mensajes guardados, ajustes propios,
-- leads) NO se toca: un usuario sin confirmar que gestiona sus propios datos no
-- le hace daño a nadie, y cerrarlo seria una regresion gratuita.
--
-- ANTES DE APLICAR, comprobar que ningun usuario actual quedaria fuera:
--
--   select count(*) from auth.users where email_confirmed_at is null;
--
-- Deberia dar 0. GoTrue marca email_confirmed_at al completar OAuth, asi que
-- los usuarios de Google ya estan confirmados. Si el conteo no es 0, revisar
-- esas filas una por una antes de seguir: esta migracion les cortaria la
-- escritura en chat y comunidad.

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER por la misma razon que is_current_profile_admin() en la
-- migracion 058: auth.users no es legible por el rol authenticated, asi que una
-- politica que la consulte directamente fallaria. La funcion corre con los
-- permisos de su dueño.
--
-- STABLE, no VOLATILE: dentro de una misma sentencia el resultado no cambia, y
-- eso permite al planner evaluarla una sola vez por consulta en lugar de una vez
-- por fila. En un SELECT de mil mensajes la diferencia es real.
create or replace function public.is_current_user_confirmed()
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
      and u.email_confirmed_at is not null
  );
$fn$;

comment on function public.is_current_user_confirmed() is
  'True si el correo del usuario actual esta confirmado. SECURITY DEFINER porque auth.users no es legible desde el rol authenticated. Se usa en las politicas de escritura de contenido publico.';

-- anon se revoca por nombre, no solo via public: Supabase concede execute a
-- anon/authenticated/service_role por privilegios por defecto en cada funcion
-- nueva del esquema public, y ese grant explicito sobrevive al revoke de public.
revoke all on function public.is_current_user_confirmed() from public, anon;
grant execute on function public.is_current_user_confirmed() to authenticated;

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------
-- Cada politica conserva su condicion original intacta y solo le suma la
-- comprobacion. Los nombres tambien se conservan: renombrarlas dejaria las
-- viejas vivas y la restriccion no serviria de nada.
drop policy if exists "Authenticated users can insert own chat messages" on public.chat_messages;
create policy "Authenticated users can insert own chat messages"
on public.chat_messages
for insert
with check (
  auth.uid() = user_id
  and public.is_current_user_confirmed()
);

drop policy if exists "Users attach files to their own messages" on public.chat_message_attachments;
create policy "Users attach files to their own messages"
on public.chat_message_attachments
for insert
with check (
  auth.uid() = uploader_id
  and public.is_current_user_confirmed()
  and exists (
    select 1 from public.chat_messages m
    where m.id = message_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Users highlight messages" on public.chat_highlighted_messages;
create policy "Users highlight messages"
on public.chat_highlighted_messages
for insert
with check (
  auth.uid() = highlighted_by
  and public.is_current_user_confirmed()
);

-- ---------------------------------------------------------------------------
-- Comunidad
-- ---------------------------------------------------------------------------
drop policy if exists "Users insert own community posts" on public.community_posts;
create policy "Users insert own community posts"
on public.community_posts
for insert
with check (
  auth.uid() = author_id
  and public.is_current_user_confirmed()
);

drop policy if exists "Users insert own community comments" on public.community_comments;
create policy "Users insert own community comments"
on public.community_comments
for insert
with check (
  auth.uid() = author_id
  and public.is_current_user_confirmed()
);

drop policy if exists "Users insert own community likes" on public.community_post_likes;
create policy "Users insert own community likes"
on public.community_post_likes
for insert
with check (
  auth.uid() = user_id
  and public.is_current_user_confirmed()
);

notify pgrst, 'reload schema';
