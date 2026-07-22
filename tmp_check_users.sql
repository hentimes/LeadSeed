select p.id, p.email, p.email_provider
from public.profiles p
where p.email in ('planespro.cl@gmail.com','hentimes@gmail.com');
