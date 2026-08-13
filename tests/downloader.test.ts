import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { download } from '../src/downloader.js';
afterEach(() => vi.unstubAllGlobals());
describe('download', () => {
  it('verifies and finalizes atomically', async () => {
    const body = 'verified model fragment';
    const digest = createHash('sha256').update(body).digest('hex');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(body, { status: 200, headers: { 'content-length': String(body.length) } }),
      ),
    );
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fouad-dl-'));
    const file = path.join(dir, 'model.gguf');
    await download('https://example.invalid/model', file, digest, () => {});
    expect(await readFile(file, 'utf8')).toBe(body);
  });
});
