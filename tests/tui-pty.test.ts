import { describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';

const supported = process.platform !== 'win32' && spawnSync('which', ['script']).status === 0;

describe.skipIf(!supported)('real pseudo-terminal', () => {
  it('opens slash help and restores terminal', async () => {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(
        'script',
        [
          '-qfec',
          'stty rows 24 cols 100; env NODE_ENV=test FOUAD_SKIP_SETUP=1 timeout 8s node dist/cli.js',
          '/dev/null',
        ],
        {
          cwd: process.cwd(),
          env: { ...process.env, TERM: 'xterm-256color' },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
      let transcript = '';
      const collect = (chunk: Buffer) => {
        transcript += chunk.toString('utf8');
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      const timers: NodeJS.Timeout[] = [];
      const typeLikeUser = (text: string, start: number) => {
        for (const [index, character] of [...text].entries())
          timers.push(setTimeout(() => child.stdin.write(character), start + index * 70));
        timers.push(setTimeout(() => child.stdin.write('\r'), start + text.length * 70 + 120));
      };
      typeLikeUser('/help', 900);
      timers.push(setTimeout(() => child.stdin.write('\u000b'), 2300));
      timers.push(setTimeout(() => child.stdin.write('\u001b'), 2600));
      timers.push(setTimeout(() => child.stdin.write('\u0010'), 2900));
      timers.push(setTimeout(() => child.stdin.write('\u001b'), 3200));
      timers.push(setTimeout(() => child.stdin.write('?'), 3500));
      timers.push(setTimeout(() => child.stdin.write('\u001b'), 3800));
      typeLikeUser('/models', 4100);
      typeLikeUser('/quit', 5600);
      const guard = setTimeout(() => child.kill('SIGKILL'), 9000);
      child.once('error', reject);
      child.once('exit', () => {
        for (const timer of timers) clearTimeout(timer);
        clearTimeout(guard);
        resolve(transcript);
      });
    });
    expect(output).toContain('FOUAD AI');
    expect(output).toContain('/models');
    expect(output).toContain('COMMANDS');
    expect(output).toContain('MODELS');
    expect(output).toContain('SHORTCUTS');
    expect(output).toContain('Underlying model: Qwen');
    expect(output).toContain('\u001b[?1049h');
    expect(output).toContain('\u001b[?1049l');
    expect(output).toContain('\u001b[?25h');
  }, 10_000);
});
