select user_id, id, provider, channel_name, from_name, from_email, is_active, is_default, daily_limit, credentials_hint, last_test_status
from public.user_email_channels
where user_id in (
  select id from public.profiles where email in ('planespro.cl@gmail.com','hentimes@gmail.com')
)
order by user_id, created_at;
