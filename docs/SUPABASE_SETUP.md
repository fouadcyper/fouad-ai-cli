# Supabase setup

The target project reference is `icpegitgbqdkuhgfqevh`. Verify that MCP or the Supabase CLI reports this exact project before applying anything. The declarative schemas are in `supabase/schemas/`.

Generate and review a migration from the declarative schema, apply it to the correct project, then run security and performance advisors. Disable email confirmation manually in Supabase Dashboard under Authentication settings. Keep email/password sign-in enabled and do not enable social providers, password recovery UI, 2FA, or anonymous sign-in.

RLS protects user-owned rows. Administrative writes use the Worker service role and are audited. Never expose the service-role key to the browser or CLI.
