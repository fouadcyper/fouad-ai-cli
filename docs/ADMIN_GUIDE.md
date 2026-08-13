# Admin guide

Register a normal email/password account first. Apply the reviewed database schema, export Supabase server credentials only in the current shell, then run `npm run admin:create`. The script requests the existing email twice and never reads or stores a password.

Provider secret values are added with Wrangler, not in the browser. The Admin UI stores only the secret reference. Protect the final administrator from demotion or deletion in the server mutation transaction.
