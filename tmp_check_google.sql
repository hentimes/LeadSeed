select user_id, provider, google_email, token_scope, token_expires_at, (refresh_token is not null) as has_refresh, (access_token is not null) as has_access
from public.user_calendar_connections
where google_email in ('planespro.cl@gmail.com','hentimes@gmail.com')
order by google_email;
