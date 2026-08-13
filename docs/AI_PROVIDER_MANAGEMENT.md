# AI provider management

The database stores provider metadata and `secret_reference`, never secret values. Provider keys are configured through Wrangler or Cloudflare Secrets Store. Model aliases such as `default`, `fast`, and `smart` decouple CLI releases from provider changes.

Google AI Studio is the intended first hosted provider. It remains disabled until a fresh `GOOGLE_AI_API_KEY` is installed and the account's available models and current Free Tier eligibility are verified. Local CLI models remain independent of the hosted gateway.

## Admin provider page

After applying `supabase/migrations/20260813201000_provider_registry.sql` to the
correct Supabase project, an administrator can open `/admin`, choose **Providers**,
and add or edit provider metadata. The page accepts an adapter, HTTPS base URL,
priority, timeout, maintenance state, and a Cloudflare secret name. It never
accepts or displays a secret value.

Store the value privately in the Worker, for example:

```bash
npx wrangler secret put GOOGLE_AI_API_KEY --config apps/platform-worker/wrangler.jsonc
```

The Worker exposes the protected `GET /api/v1/admin/providers`, `POST
/api/v1/admin/providers`, and `PATCH /api/v1/admin/providers/:id` endpoints.
They require an authenticated user with the `admin` role and use the service
role only server-side for database writes.
