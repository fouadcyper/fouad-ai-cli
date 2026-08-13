create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  status text not null default 'active' check (status in ('active', 'disabled', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id text primary key check (id in ('free', 'pro', 'team', 'enterprise')),
  name text not null,
  enabled boolean not null default false,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (id, name, enabled)
values ('free', 'Free', true), ('pro', 'Pro', false), ('team', 'Team', false), ('enterprise', 'Enterprise', false)
on conflict (id) do nothing;

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cli_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  platform text not null,
  device_fingerprint_hash text not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, device_fingerprint_hash)
);
create index if not exists cli_devices_user_created_idx on public.cli_devices (user_id, created_at desc);

create table if not exists public.cli_auth_requests (
  id uuid primary key default gen_random_uuid(),
  device_code_hash text not null unique,
  user_code_hash text not null unique,
  state_hash text not null,
  pkce_challenge text not null,
  device_name text not null,
  platform text not null,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'expired', 'consumed')),
  expires_at timestamptz not null,
  poll_interval_seconds integer not null default 5 check (poll_interval_seconds between 3 and 30),
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index if not exists cli_auth_requests_expiry_idx on public.cli_auth_requests (expires_at) where status = 'pending';

create table if not exists public.cli_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.cli_devices(id) on delete cascade,
  token_family_id uuid not null default gen_random_uuid(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists cli_sessions_user_idx on public.cli_sessions (user_id, created_at desc);
create index if not exists cli_sessions_device_idx on public.cli_sessions (device_id);

create table if not exists public.cli_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cli_sessions(id) on delete cascade,
  token_hash text not null unique,
  parent_token_hash text,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cli_refresh_tokens_session_idx on public.cli_refresh_tokens (session_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.plans enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.cli_devices enable row level security;
alter table public.cli_auth_requests enable row level security;
alter table public.cli_sessions enable row level security;
alter table public.cli_refresh_tokens enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists user_roles_owner_select on public.user_roles;
create policy user_roles_owner_select on public.user_roles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists entitlements_owner_select on public.user_entitlements;
create policy entitlements_owner_select on public.user_entitlements for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists devices_owner_select on public.cli_devices;
create policy devices_owner_select on public.cli_devices for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists sessions_owner_select on public.cli_sessions;
create policy sessions_owner_select on public.cli_sessions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists plans_public_select on public.plans;
create policy plans_public_select on public.plans for select to anon, authenticated using (enabled = true);

revoke all on public.profiles, public.user_roles, public.plans, public.user_entitlements,
  public.cli_devices, public.cli_auth_requests, public.cli_sessions, public.cli_refresh_tokens
from anon, authenticated;
grant select on public.plans to anon, authenticated;
grant select on public.profiles, public.user_roles, public.user_entitlements, public.cli_devices, public.cli_sessions to authenticated;
grant update (username, display_name, avatar_url, locale, updated_at) on public.profiles to authenticated;

create or replace function private.provision_fouad_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, username, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'Fouad user'), '@', 1)), 80)
  ) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_entitlements (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.provision_fouad_user() from public, anon, authenticated;

drop trigger if exists provision_fouad_user_after_signup on auth.users;
create trigger provision_fouad_user_after_signup
after insert on auth.users
for each row execute function private.provision_fouad_user();

insert into public.profiles (user_id, username, display_name)
select id, 'user_' || substr(replace(id::text, '-', ''), 1, 12),
  left(coalesce(raw_user_meta_data ->> 'display_name', split_part(coalesce(email, 'Fouad user'), '@', 1)), 80)
from auth.users on conflict (user_id) do nothing;
insert into public.user_roles (user_id) select id from auth.users on conflict (user_id) do nothing;
insert into public.user_entitlements (user_id) select id from auth.users on conflict (user_id) do nothing;

do $$
begin
  if to_regclass('public.admin_roles') is not null then
    execute 'update public.user_roles ur set role = ''admin'', updated_at = now() from public.admin_roles ar where ur.user_id = ar.user_id';
  end if;
end
$$;
