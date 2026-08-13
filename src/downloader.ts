import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { FouadError } from './errors.js';
export interface Progress {
  downloaded: number;
  total: number | null;
  speed: number;
  resumed: boolean;
}
export async function sha256(file: string): Promise<string> {
  const h = createHash('sha256');
  await pipeline(createReadStream(file), h);
  return h.digest('hex');
}
export async function download(
  url: string,
  destination: string,
  expectedSha256: string | undefined,
  onProgress: (p: Progress) => void,
  signal?: AbortSignal,
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  const partial = `${destination}.part`;
  let offset = 0;
  try {
    offset = (await stat(partial)).size;
  } catch {
    /* new */
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        ...(offset ? { headers: { Range: `bytes=${offset}-` } } : {}),
        ...(signal ? { signal } : {}),
        redirect: 'follow',
      });
      if (!response.ok && response.status !== 206)
        throw new FouadError('DOWNLOAD_HTTP', `HTTP ${response.status}`);
      if (offset && response.status !== 206) {
        await unlink(partial).catch(() => {});
        offset = 0;
        continue;
      }
      if (!response.body) throw new FouadError('DOWNLOAD_EMPTY', 'Download returned no body');
      const length = Number(response.headers.get('content-length') ?? 0);
      const total = length ? length + offset : null;
      const started = Date.now();
      let current = offset;
      const monitor = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          current += chunk.byteLength;
          onProgress({
            downloaded: current,
            total,
            speed: (current - offset) / Math.max(1, (Date.now() - started) / 1000),
            resumed: offset > 0,
          });
          controller.enqueue(chunk);
        },
      });
      await pipeline(
        response.body.pipeThrough(monitor),
        createWriteStream(partial, { flags: offset ? 'a' : 'w', mode: 0o600 }),
      );
      if (expectedSha256 && (await sha256(partial)) !== expectedSha256.toLowerCase())
        throw new FouadError('CHECKSUM', 'SHA-256 mismatch; partial file retained for inspection');
      await rename(partial, destination);
      return;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}
export async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
