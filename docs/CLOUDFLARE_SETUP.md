# Cloudflare setup

Wrangler configs:

- `worker/wrangler.jsonc`: standalone Workers AI service.
- `apps/platform-worker/wrangler.jsonc`: website, account API, and platform gateway.

Enter secrets interactively:

```bash
npx wrangler secret put SUPABASE_ANON_KEY --config apps/platform-worker/wrangler.jsonc
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config apps/platform-worker/wrangler.jsonc
npx wrangler secret put CLI_TOKEN_SIGNING_SECRET --config apps/platform-worker/wrangler.jsonc
npx wrangler secret put GOOGLE_AI_API_KEY --config apps/platform-worker/wrangler.jsonc
```

Use fresh values. Do not paste secrets into chat, Git, config files, or shell history. The Google model ID must be selected only after listing models available to the configured account and checking current Free Tier eligibility.
