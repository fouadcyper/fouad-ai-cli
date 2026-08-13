// Secret-only bindings are augmented here because they must not appear in wrangler.jsonc.
interface Env {
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CLI_TOKEN_SIGNING_SECRET?: string;
  GOOGLE_AI_API_KEY?: string;
}
