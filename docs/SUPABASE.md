# Supabase cloud sync

FOUAD AI can optionally synchronize session metadata and messages to Supabase. Local sessions remain the source available when cloud sync is disabled or offline.

## Target project

The checked-in schema is intended for project reference `icpegitgbqdkuhgfqevh`. Before applying it, verify that your Supabase CLI or MCP connection reports:

```text
https://icpegitgbqdkuhgfqevh.supabase.co
```

Never apply the schema if the reported project differs.

## Database schema

Apply `supabase/schemas/fouad_ai.sql` through a reviewed Supabase migration. It creates:

- `fouad_profiles`
- `fouad_ai_sessions`
- `fouad_ai_messages`
- `fouad_user_settings`
- `fouad_usage_events`

All tables enable Row Level Security. Anonymous database access is revoked. Authenticated users can access only rows whose `user_id` matches `auth.uid()`.

## Runtime configuration

Copy `.env.example` to an ignored environment file or export these values only in the current shell:

```bash
export SUPABASE_URL="https://icpegitgbqdkuhgfqevh.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
export SUPABASE_ACCESS_TOKEN="a-current-user-access-token"
fouad cloud status
```

`SUPABASE_ACCESS_TOKEN` is the authenticated user's JWT returned by Supabase Auth. A publishable/anon key is not a user access token. The CLI validates the token with `auth.getUser(token)` before enabling sync.

Do not use or distribute a `service_role` or secret key in the CLI. Do not commit any real key. The legacy anon key can be used where required, but a current publishable key is preferred for new applications.

## Verification

After applying the migration to the correct project:

1. Run Supabase security and performance advisors.
2. Authenticate as two separate test users.
3. Confirm each user can read and change only their own sessions and messages.
4. Confirm unauthenticated REST requests cannot access the five tables.
5. Run `fouad cloud status`, then `fouad cloud sessions`.

Cloud failures are non-fatal in the TUI: local chat continues, and the status bar reports `local`, `synced`, or `auth-failed`.
