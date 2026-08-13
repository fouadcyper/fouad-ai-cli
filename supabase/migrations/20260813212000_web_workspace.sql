-- Browser workspace metadata. File contents stay in the user's browser by default;
-- these tables are reserved for the authenticated sync mode and never store secrets.
create table if not exists public.web_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.web_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.web_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled session',
  model_alias text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.web_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.web_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null check (length(content) <= 64000),
  created_at timestamptz not null default now()
);
create table if not exists public.web_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  status text not null default 'revoked' check (status in ('pending','connected','revoked','expired')),
  pairing_hash text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create table if not exists public.web_action_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.web_connections(id) on delete cascade,
  action text not null,
  risk text not null check (risk in ('safe','sensitive','destructive')),
  decision text not null default 'pending' check (decision in ('pending','approved','denied','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.web_projects enable row level security;
alter table public.web_sessions enable row level security;
alter table public.web_messages enable row level security;
alter table public.web_connections enable row level security;
alter table public.web_action_approvals enable row level security;

create policy web_projects_owner on public.web_projects for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy web_sessions_owner on public.web_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy web_messages_owner on public.web_messages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy web_connections_owner on public.web_connections for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy web_approvals_owner on public.web_action_approvals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.web_projects, public.web_sessions, public.web_messages, public.web_connections, public.web_action_approvals from anon;
