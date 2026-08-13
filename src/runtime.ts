import { access } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import type { Config } from './config.js';
import { paths } from './paths.js';
import path from 'node:path';

export type ModelStatus =
  | 'not-installed'
  | 'installed'
  | 'downloading'
  | 'verifying'
  | 'starting'
  | 'ready'
  | 'stopped'
  | 'failed';
export async function modelStatus(config: Config): Promise<ModelStatus> {
  if (!config.modelPath) return 'not-installed';
  try {
    await access(config.modelPath);
  } catch {
    return 'not-installed';
  }
  try {
    const response = await fetch('http://127.0.0.1:8080/health', {
      signal: AbortSignal.timeout(800),
    });
    return response.ok ? 'ready' : 'installed';
  } catch {
    return 'installed';
  }
}
export class LocalRuntime {
  private child: ChildProcess | null = null;
  async start(config: Config): Promise<ModelStatus> {
    if (!config.modelPath) return 'not-installed';
    try {
      await access(config.modelPath);
    } catch {
      return 'not-installed';
    }
    this.child = spawn(
      'llama-server',
      [
        '--model',
        config.modelPath,
        '--host',
        '127.0.0.1',
        '--port',
        '8080',
        '--ctx-size',
        String(config.context),
      ],
      { stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: process.env.PATH ?? '' }, shell: false },
    );
    const failed = new Promise<ModelStatus>((resolve) =>
      this.child?.once('error', () => resolve('failed')),
    );
    const ready = (async () => {
      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          const r = await fetch('http://127.0.0.1:8080/health', {
            signal: AbortSignal.timeout(500),
          });
          if (r.ok) return 'ready' as const;
        } catch {
          /* starting */
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return 'failed' as const;
    })();
    return Promise.race([failed, ready]);
  }
  async stop(): Promise<void> {
    if (!this.child || this.child.killed) return;
    this.child.kill('SIGTERM');
    await Promise.race([
      new Promise<void>((resolve) => this.child?.once('exit', () => resolve())),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
    if (!this.child.killed) this.child.kill('SIGKILL');
    this.child = null;
  }
}
export const expectedModelDirectory = path.join(paths.data, 'models');
