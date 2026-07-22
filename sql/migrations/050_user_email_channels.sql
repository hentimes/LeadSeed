create extension if not exists pgcrypto;

create table if not exists public.user_email_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  channel_name text not null,
  from_name text,
  from_email text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  daily_limit integer not null default 100,
  credentials_ciphertext text not null,
  credentials_hint text,
  metadata jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  last_test_status text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists user_email_channels_user_idx
  on public.user_email_channels (user_id)
  where deleted_at is null;

create index if not exists user_email_channels_user_provider_idx
  on public.user_email_channels (user_id, provider)
  where deleted_at is null;

create unique index if not exists user_email_channels_one_default_idx
  on public.user_email_channels (user_id)
  where deleted_at is null and is_active = true and is_default = true;

alter table public.user_email_channels enable row level security;

drop policy if exists "deny direct select user_email_channels" on public.user_email_channels;
create policy "deny direct select user_email_channels"
  on public.user_email_channels
  for select
  using (false);

drop policy if exists "deny direct insert user_email_channels" on public.user_email_channels;
create policy "deny direct insert user_email_channels"
  on public.user_email_channels
  for insert
  with check (false);

drop policy if exists "deny direct update user_email_channels" on public.user_email_channels;
create policy "deny direct update user_email_channels"
  on public.user_email_channels
  for update
  using (false)
  with check (false);

drop policy if exists "deny direct delete user_email_channels" on public.user_email_channels;
create policy "deny direct delete user_email_channels"
  on public.user_email_channels
  for delete
  using (false);

create or replace function public.set_user_email_channels_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_email_channels_updated_at on public.user_email_channels;
create trigger set_user_email_channels_updated_at
before update on public.user_email_channels
for each row
execute function public.set_user_email_channels_updated_at();
