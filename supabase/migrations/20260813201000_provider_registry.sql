-- Provider metadata only. Secret values stay in Cloudflare Worker secrets.
create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  adapter text not null,
  base_url text,
  secret_reference text,
  enabled boolean not null default false,
  priority integer not null default 100 check (priority between 1 and 1000),
  timeout_ms integer not null default 30000 check (timeout_ms between 1000 and 120000),
  retry_policy jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '{}'::jsonb,
  maintenance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_providers enable row level security;
revoke all on public.ai_providers from anon, authenticated;

create or replace function public.touch_ai_provider_updated_at()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_providers_updated_at on public.ai_providers;
create trigger ai_providers_updated_at
before update on public.ai_providers
for each row execute function public.touch_ai_provider_updated_at();
