import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index.js';
function env(): Env {
  const assets = Object.create(null) as Fetcher;
  assets.fetch = vi.fn().mockResolvedValue(new Response('asset')) as Fetcher['fetch'];
  return {
    ASSETS: assets,
    SUPABASE_URL: 'https://icpegitgbqdkuhgfqevh.supabase.co',
    PUBLIC_APP_URL: 'https://fouad-cli-platform.fouadzulof26.workers.dev',
    NPM_PACKAGE_NAME: 'fouad-ai',
    GITHUB_REPOSITORY_URL: 'REPOSITORY_URL',
  };
}
describe('platform worker', () => {
  it('has safe health and readiness endpoints', async () => {
    expect(
      (
        await worker.fetch!(
          new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/health'),
          env(),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await worker.fetch!(
          new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/ready'),
          env(),
        )
      ).status,
    ).toBe(503);
  });
  it('does not expose secrets in public config', async () => {
    const data = await (
      await worker.fetch!(
        new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/api/v1/public/config'),
        env(),
      )
    ).text();
    expect(data).not.toContain('SERVICE_ROLE');
    expect(data).not.toContain('ANON_KEY');
  });
  it('has no recovery endpoint', async () => {
    const result = await worker.fetch!(
      new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/api/v1/auth/reset'),
      env(),
    );
    expect(result.status).toBe(404);
  });
  it.each(['/forgot-password', '/reset-password', '/verify-email', '/2fa'])(
    'does not serve forbidden account route %s',
    async (path) => {
      const result = await worker.fetch!(
        new Request(`https://fouad-cli-platform.fouadzulof26.workers.dev${path}`),
        env(),
      );
      expect(result.status).toBe(404);
    },
  );
  it('rejects cross-origin mutation', async () => {
    const result = await worker.fetch!(
      new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/api/v1/auth/login', {
        method: 'POST',
        headers: { origin: 'https://evil.test', 'content-type': 'application/json' },
        body: '{}',
      }),
      env(),
    );
    expect(result.status).toBe(403);
  });
  it('redirects an unauthenticated admin request to login', async () => {
    const result = await worker.fetch!(
      new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/admin'),
      env(),
    );
    expect(result.status).toBe(302);
    expect(result.headers.get('location')).toBe(
      'https://fouad-cli-platform.fouadzulof26.workers.dev/login?next=/admin',
    );
  });
  it('rejects an unauthenticated session lookup', async () => {
    const result = await worker.fetch!(
      new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/api/v1/auth/me'),
      env(),
    );
    expect(result.status).toBe(401);
  });
  it('protects the provider registry from unauthenticated callers', async () => {
    const result = await worker.fetch!(
      new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/api/v1/admin/providers'),
      env(),
    );
    expect(result.status).toBe(401);
  });
  it('preserves auth cookies when returning a login response', async () => {
    const result = await worker.fetch!(
      new Request('https://fouad-cli-platform.fouadzulof26.workers.dev/api/v1/auth/logout', {
        method: 'POST',
      }),
      env(),
    );
    expect(result.headers.get('set-cookie')).toContain('fouad_access=');
  });
});
