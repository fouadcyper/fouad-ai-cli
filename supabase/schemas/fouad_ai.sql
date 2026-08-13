-- FOUAD AI cloud schema. Apply only to project icpegitgbqdkuhgfqevh.

create table if not exists public.fouad_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fouad_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  provider text not null default 'gemini',
  model text not null default 'gemini-3.1-flash-lite',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fouad_ai_sessions_user_updated_idx
  on public.fouad_ai_sessions (user_id, updated_at desc);

create table if not exists public.fouad_ai_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.fouad_ai_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null check (char_length(content) <= 1000000),
  provider text,
  model text,
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists fouad_ai_messages_session_created_idx
  on public.fouad_ai_messages (session_id, created_at, id);
create index if not exists fouad_ai_messages_user_created_idx
  on public.fouad_ai_messages (user_id, created_at desc);

create table if not exists public.fouad_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  theme text not null default 'fouad-neon',
  provider text not null default 'gemini',
  model text not null default 'gemini-3.1-flash-lite',
  history_enabled boolean not null default true,
  sync_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.fouad_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.fouad_ai_sessions(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists fouad_usage_events_user_created_idx
  on public.fouad_usage_events (user_id, created_at desc);
create index if not exists fouad_usage_events_session_idx
  on public.fouad_usage_events (session_id) where session_id is not null;

alter table public.fouad_profiles enable row level security;
alter table public.fouad_ai_sessions enable row level security;
alter table public.fouad_ai_messages enable row level security;
alter table public.fouad_user_settings enable row level security;
alter table public.fouad_usage_events enable row level security;

drop policy if exists "fouad_profiles_owner_all" on public.fouad_profiles;
create policy "fouad_profiles_owner_all" on public.fouad_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "fouad_ai_sessions_owner_all" on public.fouad_ai_sessions;
create policy "fouad_ai_sessions_owner_all" on public.fouad_ai_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "fouad_ai_messages_owner_all" on public.fouad_ai_messages;
create policy "fouad_ai_messages_owner_all" on public.fouad_ai_messages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.fouad_ai_sessions session
      where session.id = session_id and session.user_id = (select auth.uid())
    )
  );

drop policy if exists "fouad_user_settings_owner_all" on public.fouad_user_settings;
create policy "fouad_user_settings_owner_all" on public.fouad_user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "fouad_usage_events_owner_all" on public.fouad_usage_events;
create policy "fouad_usage_events_owner_all" on public.fouad_usage_events
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.fouad_profiles to authenticated;
grant select, insert, update, delete on public.fouad_ai_sessions to authenticated;
grant select, insert, update, delete on public.fouad_ai_messages to authenticated;
grant select, insert, update, delete on public.fouad_user_settings to authenticated;
grant select, insert on public.fouad_usage_events to authenticated;
grant usage, select on sequence public.fouad_ai_messages_id_seq to authenticated;
grant usage, select on sequence public.fouad_usage_events_id_seq to authenticated;

revoke all on public.fouad_profiles from anon;
revoke all on public.fouad_ai_sessions from anon;
revoke all on public.fouad_ai_messages from anon;
revoke all on public.fouad_user_settings from anon;
revoke all on public.fouad_usage_events from anon;
