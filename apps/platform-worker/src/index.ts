import { z } from 'zod';

const MAX_BYTES = 256 * 1024;
const AuthSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
});
const RegisterSchema = AuthSchema.extend({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(80),
  confirmPassword: z.string().optional(),
});
const DeviceStartSchema = z.object({
  state: z.string().min(24).max(256),
  pkceChallenge: z.string().min(32).max(256),
  deviceName: z.string().min(1).max(120),
  platform: z.string().min(1).max(80),
});
const DevicePollSchema = z.object({
  deviceCode: z.string().min(32).max(256),
  state: z.string().min(24).max(256),
  pkceVerifier: z.string().min(32).max(256),
});
const DeviceDecisionSchema = z.object({ userCode: z.string().min(8).max(16) });
const ProviderSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  name: z.string().min(1).max(80),
  adapter: z.enum(['google-gemini', 'openai-compatible', 'ollama', 'llama-local', 'custom']),
  baseUrl: z
    .string()
    .max(500)
    .refine((value) => value === '' || isSafeProviderUrl(value), {
      message: 'Provider URL must be HTTPS and must not target a private network',
    }),
  secretReference: z
    .string()
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]{2,63}$/)
    .or(z.literal('')),
  enabled: z.boolean(),
  priority: z.number().int().min(1).max(1000),
  timeoutMs: z.number().int().min(1000).max(120000),
  maintenance: z.boolean(),
});
const ProviderPatchSchema = ProviderSchema.partial();
const WebChatSchema = z.object({
  model: z.string().min(1).max(120).default('default'),
  messages: z
    .array(
      z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(64_000) }),
    )
    .min(1)
    .max(40),
});

function isSafeProviderUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === 'metadata.google.internal' ||
      host === 'metadata.google' ||
      host === '0.0.0.0' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.internal')
    )
      return false;
    const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4) {
      const [a = 0, b = 0] = ipv4.slice(1).map(Number);
      if (
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

function response(body: unknown, status = 200, extra: HeadersInit = {}) {
  const headers = new Headers({
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  });
  if (extra instanceof Headers) extra.forEach((value, key) => headers.append(key, value));
  else new Headers(extra).forEach((value, key) => headers.append(key, value));
  return new Response(JSON.stringify(body), { status, headers });
}
function requestId(request: Request) {
  return request.headers.get('cf-ray') ?? crypto.randomUUID();
}
function fail(code: string, message: string, status: number, id: string) {
  return response({ error: message, code, requestId: id }, status);
}
async function body(request: Request) {
  const n = Number(request.headers.get('content-length') ?? 0);
  if (n > MAX_BYTES) throw new Error('TOO_LARGE');
  return request.json();
}
function sameOrigin(request: Request, env: Env) {
  const origin = request.headers.get('origin');
  return !origin || origin === env.PUBLIC_APP_URL;
}
function cookie(request: Request, name: string) {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}
async function identity(request: Request, env: Env) {
  const token = cookie(request, 'fouad_access');
  if (!token || !env.SUPABASE_ANON_KEY) return null;
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    authorization: `Bearer ${token}`,
  };
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userResponse.ok) return null;
  const user = await userResponse.json<{ id: string; email?: string }>();
  const roleResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { headers },
  );
  const roles = roleResponse.ok ? await roleResponse.json<Array<{ role: string }>>() : [];
  return { id: user.id, email: user.email, role: roles[0]?.role ?? 'user' };
}
async function supabaseAuth(env: Env, path: string, payload: unknown) {
  if (!env.SUPABASE_ANON_KEY) return null;
  return fetch(`${env.SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
async function adminRest(env: Env, path: string, init: RequestInit = {}) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
}
async function signCliToken(env: Env, sessionId: string, userId: string) {
  if (!env.CLI_TOKEN_SIGNING_SECRET) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
  const payload = btoa(JSON.stringify({ sessionId, userId, exp: expiresAt }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.CLI_TOKEN_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const encoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return { token: `${payload}.${encoded}`, expiresAt };
}
function authCookies(data: { access_token?: string; refresh_token?: string }) {
  const headers = new Headers();
  if (data.access_token)
    headers.append(
      'set-cookie',
      `fouad_access=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
    );
  if (data.refresh_token)
    headers.append(
      'set-cookie',
      `fouad_refresh=${data.refresh_token}; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
    );
  return headers;
}
async function route(request: Request, env: Env) {
  const url = new URL(request.url);
  const id = requestId(request);
  if (/^\/(forgot-password|reset-password|verify-email|confirm-email|2fa)(\/|$)/.test(url.pathname))
    return fail('NOT_FOUND', 'Route not found', 404, id);
  if (url.pathname === '/health')
    return response({ ok: true, service: 'fouad-cli-platform' }, 200, { 'x-request-id': id });
  if (url.pathname === '/ready')
    return response(
      {
        ok: Boolean(env.SUPABASE_ANON_KEY),
        auth: env.SUPABASE_ANON_KEY ? 'ready' : 'setup-required',
        ai: env.GOOGLE_AI_API_KEY ? 'configured' : 'setup-required',
      },
      env.SUPABASE_ANON_KEY ? 200 : 503,
      { 'x-request-id': id },
    );
  if (url.pathname === '/api/v1/public/config')
    return response(
      {
        appUrl: env.PUBLIC_APP_URL,
        npmPackage: env.NPM_PACKAGE_NAME,
        npmPublished: true,
        repositoryUrl:
          env.GITHUB_REPOSITORY_URL === 'REPOSITORY_URL' ? null : env.GITHUB_REPOSITORY_URL,
        plans: ['free'],
        features: { byok: false, payments: false, passwordRecovery: false },
      },
      200,
      { 'x-request-id': id },
    );
  if (request.method === 'GET' && url.pathname === '/api/v1/auth/me') {
    const current = await identity(request, env);
    return current
      ? response({ user: current }, 200, { 'x-request-id': id })
      : fail('UNAUTHENTICATED', 'Sign in is required', 401, id);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/admin') {
    const current = await identity(request, env);
    if (!current)
      return Response.redirect(new URL('/login?next=/admin', env.PUBLIC_APP_URL).toString(), 302);
    if (current.role !== 'admin')
      return new Response(
        '<!doctype html><html><body><main><h1>403 Forbidden</h1><p>Administrator access is required.</p><a href="/">Return home</a></main></body></html>',
        {
          status: 403,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'x-request-id': id,
            'x-content-type-options': 'nosniff',
          },
        },
      );
  }
  if (!sameOrigin(request, env))
    return fail('ORIGIN_REJECTED', 'Request origin is not allowed', 403, id);
  if (request.method === 'POST' && url.pathname === '/api/v1/auth/register') {
    const input = RegisterSchema.parse(await body(request));
    const upstream = await supabaseAuth(env, 'signup', {
      email: input.email,
      password: input.password,
      data: { username: input.username, display_name: input.displayName },
    });
    if (!upstream) return fail('SETUP_REQUIRED', 'Authentication is not configured', 503, id);
    if (!upstream.ok)
      return fail('AUTH_FAILED', 'Unable to create account with these credentials', 400, id);
    return response({ ok: true, message: 'Account created. Sign in to continue.' }, 201, {
      'x-request-id': id,
    });
  }
  if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    const input = AuthSchema.parse(await body(request));
    const upstream = await supabaseAuth(env, 'token?grant_type=password', input);
    if (!upstream) return fail('SETUP_REQUIRED', 'Authentication is not configured', 503, id);
    if (!upstream.ok) return fail('AUTH_FAILED', 'Invalid sign-in credentials', 401, id);
    const data = await upstream.json<{
      access_token?: string;
      refresh_token?: string;
      user?: { id?: string; email?: string };
    }>();
    const cookies = authCookies(data);
    cookies.set('x-request-id', id);
    return response(
      { ok: true, user: { id: data.user?.id, email: data.user?.email } },
      200,
      cookies,
    );
  }
  if (request.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
    const headers = new Headers({ 'x-request-id': id });
    headers.append(
      'set-cookie',
      'fouad_access=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    );
    headers.append(
      'set-cookie',
      'fouad_refresh=; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    );
    return response({ ok: true }, 200, headers);
  }
  if (request.method === 'POST' && url.pathname === '/api/v1/auth/device/start') {
    if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.CLI_TOKEN_SIGNING_SECRET)
      return fail('SETUP_REQUIRED', 'CLI authentication is not configured', 503, id);
    const input = DeviceStartSchema.parse(await body(request));
    const deviceCode = randomToken();
    const userCode = randomToken(6).slice(0, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const inserted = await adminRest(env, 'cli_auth_requests', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({
        device_code_hash: await sha256(deviceCode),
        user_code_hash: await sha256(userCode),
        state_hash: await sha256(input.state),
        pkce_challenge: input.pkceChallenge,
        device_name: input.deviceName,
        platform: input.platform,
        expires_at: expiresAt,
        poll_interval_seconds: 5,
      }),
    });
    if (!inserted?.ok) return fail('AUTH_STORAGE_FAILED', 'Unable to start authorization', 503, id);
    return response(
      {
        deviceCode,
        userCode,
        verificationUrl: `${env.PUBLIC_APP_URL}/cli/authorize?user_code=${encodeURIComponent(userCode)}`,
        expiresIn: 600,
        interval: 5,
      },
      201,
      { 'x-request-id': id },
    );
  }
  if (
    request.method === 'POST' &&
    (url.pathname === '/api/v1/auth/device/approve' || url.pathname === '/api/v1/auth/device/deny')
  ) {
    const current = await identity(request, env);
    if (!current) return fail('UNAUTHENTICATED', 'Sign in is required', 401, id);
    const input = DeviceDecisionSchema.parse(await body(request));
    const status = url.pathname.endsWith('/approve') ? 'approved' : 'denied';
    const updated = await adminRest(
      env,
      `cli_auth_requests?user_code_hash=eq.${encodeURIComponent(await sha256(input.userCode))}&status=eq.pending&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
      {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ status, user_id: current.id }),
      },
    );
    const rows = updated?.ok ? await updated.json<Array<{ id: string }>>() : [];
    if (!rows.length)
      return fail('AUTH_REQUEST_NOT_FOUND', 'Authorization request is invalid or expired', 404, id);
    return response({ ok: true, status }, 200, { 'x-request-id': id });
  }
  if (request.method === 'POST' && url.pathname === '/api/v1/auth/device/poll') {
    if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.CLI_TOKEN_SIGNING_SECRET)
      return fail('SETUP_REQUIRED', 'CLI authentication is not configured', 503, id);
    const input = DevicePollSchema.parse(await body(request));
    const lookup = await adminRest(
      env,
      `cli_auth_requests?select=*&device_code_hash=eq.${encodeURIComponent(await sha256(input.deviceCode))}&limit=1`,
    );
    const requests = lookup?.ok
      ? await lookup.json<
          Array<{
            id: string;
            state_hash: string;
            pkce_challenge: string;
            device_name: string;
            platform: string;
            user_id: string | null;
            status: string;
            expires_at: string;
          }>
        >()
      : [];
    const authRequest = requests[0];
    if (!authRequest)
      return fail('INVALID_DEVICE_CODE', 'Authorization request is invalid', 400, id);
    if (new Date(authRequest.expires_at).getTime() <= Date.now())
      return fail('AUTH_EXPIRED', 'Authorization request expired', 410, id);
    if (
      authRequest.state_hash !== (await sha256(input.state)) ||
      authRequest.pkce_challenge !== (await sha256(input.pkceVerifier))
    )
      return fail('PKCE_FAILED', 'Authorization verification failed', 400, id);
    if (authRequest.status === 'pending')
      return fail('AUTH_PENDING', 'Authorization pending', 428, id);
    if (authRequest.status !== 'approved' || !authRequest.user_id)
      return fail('AUTH_DENIED', 'Authorization denied', 403, id);
    const fingerprint = await sha256(`${input.deviceCode}:${authRequest.platform}`);
    const deviceResult = await adminRest(
      env,
      'cli_devices?on_conflict=user_id,device_fingerprint_hash',
      {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          user_id: authRequest.user_id,
          name: authRequest.device_name,
          platform: authRequest.platform,
          device_fingerprint_hash: fingerprint,
          last_seen_at: new Date().toISOString(),
        }),
      },
    );
    const devices = deviceResult?.ok ? await deviceResult.json<Array<{ id: string }>>() : [];
    if (!devices[0]) return fail('SESSION_FAILED', 'Unable to register device', 503, id);
    const sessionResult = await adminRest(env, 'cli_sessions', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: authRequest.user_id,
        device_id: devices[0].id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen_at: new Date().toISOString(),
      }),
    });
    const sessions = sessionResult?.ok ? await sessionResult.json<Array<{ id: string }>>() : [];
    const session = sessions[0];
    if (!session) return fail('SESSION_FAILED', 'Unable to create session', 503, id);
    const signed = await signCliToken(env, session.id, authRequest.user_id);
    if (!signed) return fail('SESSION_FAILED', 'Unable to create session', 503, id);
    const refreshToken = randomToken(48);
    await adminRest(env, 'cli_refresh_tokens', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({
        session_id: session.id,
        token_hash: await sha256(refreshToken),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    await adminRest(env, `cli_auth_requests?id=eq.${authRequest.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'consumed', consumed_at: new Date().toISOString() }),
    });
    const profileResponse = await adminRest(
      env,
      `profiles?select=user_id,display_name&user_id=eq.${authRequest.user_id}`,
    );
    const profiles = profileResponse?.ok
      ? await profileResponse.json<Array<{ user_id: string; display_name: string }>>()
      : [];
    return response(
      {
        status: 'approved',
        accessToken: signed.token,
        refreshToken,
        expiresAt: new Date(signed.expiresAt * 1000).toISOString(),
        user: { id: authRequest.user_id, displayName: profiles[0]?.display_name },
      },
      200,
      { 'x-request-id': id },
    );
  }
  if (url.pathname === '/api/v1/admin/providers' && request.method === 'GET') {
    const current = await identity(request, env);
    if (!current) return fail('UNAUTHENTICATED', 'Sign in is required', 401, id);
    if (current.role !== 'admin')
      return fail('FORBIDDEN', 'Administrator access is required', 403, id);
    const result = await adminRest(
      env,
      'ai_providers?select=id,slug,name,adapter,base_url,secret_reference,enabled,priority,timeout_ms,maintenance,created_at,updated_at&order=priority.asc',
    );
    if (!result) return fail('SETUP_REQUIRED', 'Provider storage is not configured', 503, id);
    if (!result.ok) return fail('DATABASE_NOT_READY', 'Provider storage is not ready', 503, id);
    return response({ providers: await result.json() }, 200, { 'x-request-id': id });
  }
  if (url.pathname === '/api/v1/admin/providers' && request.method === 'POST') {
    const current = await identity(request, env);
    if (!current) return fail('UNAUTHENTICATED', 'Sign in is required', 401, id);
    if (current.role !== 'admin')
      return fail('FORBIDDEN', 'Administrator access is required', 403, id);
    const input = ProviderSchema.parse(await body(request));
    const result = await adminRest(env, 'ai_providers', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        slug: input.slug,
        name: input.name,
        adapter: input.adapter,
        base_url: input.baseUrl || null,
        secret_reference: input.secretReference || null,
        enabled: input.enabled,
        priority: input.priority,
        timeout_ms: input.timeoutMs,
        maintenance: input.maintenance,
      }),
    });
    if (!result) return fail('SETUP_REQUIRED', 'Provider storage is not configured', 503, id);
    if (!result.ok)
      return fail('PROVIDER_SAVE_FAILED', 'Unable to save provider settings', 400, id);
    return response({ provider: (await result.json<Array<Record<string, unknown>>>())[0] }, 201, {
      'x-request-id': id,
    });
  }
  const providerMatch = url.pathname.match(/^\/api\/v1\/admin\/providers\/([0-9a-f-]{36})$/i);
  if (providerMatch && request.method === 'PATCH') {
    const current = await identity(request, env);
    if (!current) return fail('UNAUTHENTICATED', 'Sign in is required', 401, id);
    if (current.role !== 'admin')
      return fail('FORBIDDEN', 'Administrator access is required', 403, id);
    const input = ProviderPatchSchema.parse(await body(request));
    const update: Record<string, unknown> = {};
    if (input.slug !== undefined) update.slug = input.slug;
    if (input.name !== undefined) update.name = input.name;
    if (input.adapter !== undefined) update.adapter = input.adapter;
    if (input.baseUrl !== undefined) update.base_url = input.baseUrl || null;
    if (input.secretReference !== undefined)
      update.secret_reference = input.secretReference || null;
    if (input.enabled !== undefined) update.enabled = input.enabled;
    if (input.priority !== undefined) update.priority = input.priority;
    if (input.timeoutMs !== undefined) update.timeout_ms = input.timeoutMs;
    if (input.maintenance !== undefined) update.maintenance = input.maintenance;
    const result = await adminRest(env, `ai_providers?id=eq.${providerMatch[1]}`, {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(update),
    });
    if (!result) return fail('SETUP_REQUIRED', 'Provider storage is not configured', 503, id);
    if (!result.ok)
      return fail('PROVIDER_SAVE_FAILED', 'Unable to save provider settings', 400, id);
    return response({ provider: (await result.json<Array<Record<string, unknown>>>())[0] }, 200, {
      'x-request-id': id,
    });
  }
  if (url.pathname === '/api/v1/ai/chat' && request.method === 'POST') {
    const current = await identity(request, env);
    if (!current) return fail('UNAUTHENTICATED', 'Sign in is required', 401, id);
    if (!env.GOOGLE_AI_API_KEY)
      return fail('AI_NOT_CONFIGURED', 'The hosted AI provider is not configured', 503, id);
    const input = WebChatSchema.parse(await body(request));
    const model =
      input.model === 'default' || input.model === 'fast' ? 'gemini-3.1-flash-lite' : input.model;
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(env.GOOGLE_AI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: input.messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
        }),
      },
    );
    if (!upstream.ok)
      return fail(
        'AI_PROVIDER_FAILED',
        'The hosted AI provider rejected the request',
        upstream.status === 429 ? 429 : 502,
        id,
      );
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/event-stream; charset=utf-8',
        'x-request-id': id,
        'x-content-type-options': 'nosniff',
      },
    });
  }
  if (url.pathname.startsWith('/api/v1/admin/') || url.pathname.startsWith('/api/v1/ai/'))
    return fail(
      'SETUP_REQUIRED',
      'Database migration and Worker secrets must be configured before this endpoint is enabled',
      503,
      id,
    );
  if (url.pathname.startsWith('/api/')) return fail('NOT_FOUND', 'API route not found', 404, id);
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      const id = requestId(request);
      if (error instanceof z.ZodError)
        return fail('INVALID_REQUEST', 'Request validation failed', 400, id);
      if (error instanceof Error && error.message === 'TOO_LARGE')
        return fail('REQUEST_TOO_LARGE', 'Request body is too large', 413, id);
      console.error(
        JSON.stringify({
          message: 'request failed',
          requestId: id,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      return fail('INTERNAL_ERROR', 'Internal server error', 500, id);
    }
  },
} satisfies ExportedHandler<Env>;
