-- 113 - Simetria: editar un post tambien exige correo confirmado
--
-- Cierra el ultimo hueco de la serie 110-112. Insertar un post ya exigia correo
-- confirmado, pero editarlo no. Hoy no es explotable -para tener un post que
-- editar hay que haberlo insertado antes, y eso ya estaba cerrado, y GoTrue no
-- revierte email_confirmed_at-, asi que esto es simetria de diseño, no un
-- parche urgente. Se aplica igual porque cuesta una linea y porque una politica
-- que se salta la regla es una invitacion a copiarla mal en la siguiente tabla.
--
-- Lo que NO se toca y por que:
--
-- - "Receiver marks direct messages read": marcar como leido no publica nada
--   que otro vea. Exigirle confirmacion no protege a nadie.
-- - La rama de staff. La condicion original admite admin Y helpers
--   (coalesce(p.is_helper, false) = true), y se copia literal. Sustituirla por
--   is_current_profile_admin(), que es lo primero que apetece hacer al ver ese
--   EXISTS repetido, dejaria a los helpers sin poder moderar: seria una
--   regresion disfrazada de limpieza.

drop policy if exists "Authors or staff update community posts" on public.community_posts;
create policy "Authors or staff update community posts"
on public.community_posts
for update
using (
  auth.uid() = author_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or coalesce(p.is_helper, false) = true)
  )
)
with check (
  (auth.uid() = author_id and public.is_current_user_confirmed())
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or coalesce(p.is_helper, false) = true)
  )
);

notify pgrst, 'reload schema';
