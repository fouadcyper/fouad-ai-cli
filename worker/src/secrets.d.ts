// Wrangler generates all configured bindings. Secret names are intentionally absent from
// wrangler.jsonc, so this declaration augments only the secret injected with `wrangler secret put`.
interface Env {
  SUPABASE_PUBLISHABLE_KEY: string;
}
