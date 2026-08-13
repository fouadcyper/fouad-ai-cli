import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index.js';

function environment(overrides: Partial<Env> = {}): Env {
  const ai = Object.create(null) as Ai;
  ai.run = vi.fn() as Ai['run'];
  return {
    AI: ai,
    DEFAULT_MODEL: '@cf/qwen/qwen2.5-coder-32b-instruct',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: '',
    ...overrides,
  } as Env;
}

describe('FOUAD AI Worker', () => {
  it('exposes public health without revealing configuration values', async () => {
    const response = await worker.fetch!(new Request('https://worker.test/health'), environment());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: 'fouad-ai-api' });
  });

  it('fails closed when Supabase authentication is not configured', async () => {
    const response = await worker.fetch!(
      new Request('https://worker.test/v1/chat', { method: 'POST', body: '{}' }),
      environment(),
    );
    expect(response.status).toBe(503);
  });

  it('rejects missing bearer authentication before inference', async () => {
    const aiRun = vi.fn();
    const ai = Object.create(null) as Ai;
    ai.run = aiRun as Ai['run'];
    const response = await worker.fetch!(
      new Request('https://worker.test/v1/chat', { method: 'POST', body: '{}' }),
      environment({
        AI: ai,
        SUPABASE_PUBLISHABLE_KEY: 'public-key',
      }),
    );
    expect(response.status).toBe(401);
    expect(aiRun).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown routes', async () => {
    const response = await worker.fetch!(new Request('https://worker.test/missing'), environment());
    expect(response.status).toBe(404);
  });
});
