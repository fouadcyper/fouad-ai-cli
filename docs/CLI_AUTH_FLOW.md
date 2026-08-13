# CLI browser authorization

`fouad login` generates a random state and PKCE verifier, submits only the challenge, opens `/cli/authorize`, then polls at the server-provided interval. Device codes are single-use and short-lived. The production Worker must store only hashes, rotate refresh tokens, reject replay, and revoke a token family after reuse detection.

Credentials are stored in the OS keychain when available. The current portable fallback is a local file with mode `0600`; it never stores the account password.
