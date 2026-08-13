# FOUAD AI Cloudflare Worker

The Worker in `worker/` exposes an authenticated streaming AI endpoint backed by Cloudflare Workers AI.

- Worker name: `fouad-ai-api`
- Public routes: `GET /`, `GET /health`
- Protected route: `POST /v1/chat`
- Authentication: Supabase user access token
- Model: `@cf/qwen/qwen2.5-coder-32b-instruct`

The protected endpoint fails closed until `SUPABASE_PUBLISHABLE_KEY` is configured as a Worker secret. Never set a Supabase service-role key.

```bash
npm run worker:check
npm run worker:deploy:dry
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --config worker/wrangler.jsonc
npm run worker:deploy
```

Enter a newly issued publishable key interactively. Do not paste it into source, `wrangler.jsonc`, shell history, or documentation.

Example request after obtaining a Supabase user access token:

```bash
curl https://fouad-ai-api.fouadzulof26.workers.dev/v1/chat \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"messages":[{"role":"user","content":"Hello"}]}'
```

Workers AI includes an account allocation and may incur charges after current limits are exceeded. Review the live Cloudflare pricing and model terms before production traffic.
