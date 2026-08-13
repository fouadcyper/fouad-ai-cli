import os from 'node:os';
import { statfs } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
export interface Hardware {
  os: string;
  arch: string;
  cpu: string;
  cores: number;
  ramBytes: number;
  freeDiskBytes: number;
  gpu: string | null;
  acceleration: string[];
  colorDepth: number;
}
export async function detectHardware(target = process.cwd()): Promise<Hardware> {
  const cpus = os.cpus();
  const fs = await statfs(target);
  let gpu: string | null = null;
  if (process.platform === 'linux')
    try {
      gpu =
        (await execFileAsync('lspci', [], { timeout: 2000, maxBuffer: 256000 })).stdout
          .split('\n')
          .find((l) => /vga|3d controller/i.test(l))
          ?.trim() ?? null;
    } catch {
      /* optional */
    }
  const acceleration: string[] = [];
  if (process.arch === 'arm64') acceleration.push('NEON');
  if (cpus.some((c) => /avx2/i.test(c.model))) acceleration.push('AVX2');
  if (gpu && /nvidia/i.test(gpu)) acceleration.push('CUDA-compatible');
  return {
    os: process.platform,
    arch: process.arch,
    cpu: cpus[0]?.model ?? 'unknown',
    cores: cpus.length,
    ramBytes: os.totalmem(),
    freeDiskBytes: fs.bavail * fs.bsize,
    gpu,
    acceleration,
    colorDepth: process.stdout.getColorDepth?.() ?? 1,
  };
}
