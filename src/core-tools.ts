import { readFile, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { ToolRegistry } from './tools.js';
import { safePath } from './security.js';
const execFileAsync = promisify(execFile);
const sensitive =
  /(^|\/)(?:\.env(?:\.|$)|id_(?:rsa|ed25519)|credentials?|\.ssh|password|secrets?)(\/|$)/i;
export function createCoreTools(workspace: string) {
  const registry = new ToolRegistry();
  registry.register({
    name: 'read_file',
    description: 'Read a non-sensitive file inside workspace',
    source: 'core',
    input: z.object({ path: z.string() }),
    risk: 'safe',
    permissions: ['workspace:read'],
    timeoutMs: 5000,
    run: async ({ path }, signal) => {
      if (sensitive.test(path)) throw new Error('Sensitive path denied');
      const file = await safePath(workspace, path);
      return readFile(file, { encoding: 'utf8', signal });
    },
  });
  registry.register({
    name: 'list_files',
    description: 'List a workspace directory',
    source: 'core',
    input: z.object({ path: z.string().default('.') }),
    risk: 'safe',
    permissions: ['workspace:read'],
    timeoutMs: 5000,
    run: async ({ path }) =>
      readdir(await safePath(workspace, path), { withFileTypes: true }).then((items) =>
        items.map((i) => ({ name: i.name, type: i.isDirectory() ? 'directory' : 'file' })),
      ),
  });
  registry.register({
    name: 'search',
    description: 'Search workspace with ripgrep',
    source: 'core',
    input: z.object({ query: z.string().min(1) }),
    risk: 'safe',
    permissions: ['workspace:read'],
    timeoutMs: 10000,
    run: async ({ query }, signal) =>
      (
        await execFileAsync(
          'rg',
          [
            '--line-number',
            '--hidden',
            '--glob',
            '!.git/**',
            '--glob',
            '!node_modules/**',
            '--glob',
            '!.env*',
            query,
            '.',
          ],
          { cwd: workspace, signal, timeout: 10000, maxBuffer: 1_000_000 },
        )
      ).stdout,
  });
  registry.register({
    name: 'write_patch',
    description: 'Write approved content after a diff preview',
    source: 'core',
    input: z.object({ path: z.string(), content: z.string(), approved: z.literal(true) }),
    risk: 'write',
    permissions: ['workspace:write', 'approval'],
    timeoutMs: 5000,
    run: async ({ path, content }, signal) =>
      writeFile(await safePath(workspace, path, true), content, { encoding: 'utf8', signal }),
  });
  registry.register({
    name: 'git_status',
    description: 'Read Git status',
    source: 'core',
    input: z.object({}),
    risk: 'safe',
    permissions: ['workspace:read'],
    timeoutMs: 5000,
    run: async () =>
      (
        await execFileAsync('git', ['status', '--short'], {
          cwd: workspace,
          timeout: 5000,
          maxBuffer: 500000,
        })
      ).stdout,
  });
  return registry;
}
