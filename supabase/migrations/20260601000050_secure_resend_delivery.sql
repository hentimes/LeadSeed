-- Query permanente
-- Dominio: profiles / email infrastructure
-- Objetivo: retirar secretos de Resend del perfil y consolidar Resend como backend central de correo

begin;

update public.profiles
set email_provider = 'resend'
where email_provider is null
   or trim(email_provider) = ''
   or email_provider = 'emailjs';

update public.profiles
set resend_api_key = null
where resend_api_key is not null;

alter table public.profiles
  alter column email_provider set default 'resend';

alter table public.profiles
  drop column if exists resend_api_key;

commit;
