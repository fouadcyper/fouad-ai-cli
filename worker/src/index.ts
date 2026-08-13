import { z } from 'zod';

const MODEL = '@cf/qwen/qwen2.5-coder-32b-instruct' as const;
const MAX_BODY_BYTES = 256 * 1024;

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant', 'tool']),
        content: z.string().min(1).max(100_000),
      }),
    )
    .min(1)
    .max(100),
  maxTokens: z.number().int().min(1).max(4096).default(1024),
  temperature: z.number().min(0).max(2).default(0.3),
});

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

async function authenticate(request: Request, env: Env): Promise<string | null> {
  const token = bearerToken(request);
  if (!token || !env.SUPABASE_PUBLISHABLE_KEY) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
    },
    signal: request.signal,
  });
  if (!response.ok) return null;
  const user = await response.json<{ id?: unknown }>();
  return typeof user.id === 'string' ? user.id : null;
}

async function parseChatRequest(request: Request): Promise<z.infer<typeof ChatRequestSchema>> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES)
    throw new Error('REQUEST_TOO_LARGE');
  return ChatRequestSchema.parse(await request.json());
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/') {
    return json({
      name: 'FOUAD AI API',
      status: 'ready',
      provider: 'cloudflare-workers-ai',
      model: env.DEFAULT_MODEL,
      authentication: 'supabase',
    });
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    return json({ ok: true, service: 'fouad-ai-api' });
  }
  if (request.method !== 'POST' || url.pathname !== '/v1/chat') {
    return json({ error: 'Not found' }, 404);
  }
  if (!env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ error: 'Service authentication is not configured' }, 503);
  }
  const userId = await authenticate(request, env);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const input = await parseChatRequest(request);
  const output = await env.AI.run(MODEL, {
    messages: input.messages,
    max_tokens: input.maxTokens,
    temperature: input.temperature,
    stream: true,
  });
  if (!(output instanceof ReadableStream)) {
    return json({ error: 'Inference did not return a stream' }, 502);
  }
  return new Response(output, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no',
      'x-content-type-options': 'nosniff',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof z.ZodError)
        return json({ error: 'Invalid request', issues: error.issues }, 400);
      if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE')
        return json({ error: 'Request body is too large' }, 413);
      console.error(
        JSON.stringify({
          message: 'request failed',
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      return json({ error: 'Internal server error' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
