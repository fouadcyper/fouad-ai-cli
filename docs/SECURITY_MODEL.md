# Security model

Supabase Auth owns passwords. RLS restricts user-owned data. The Worker enforces origin checks, bounded JSON bodies, generic authentication errors, request IDs, security headers, and server-only secrets. Administrative mutations require server authorization and audit logging. Provider endpoints must be allowlisted and private, loopback, link-local, and metadata IP ranges are forbidden.

No password recovery, email confirmation UI, social OAuth, or 2FA route is implemented by this platform.
