import path from 'node:path';
import { lstat, realpath } from 'node:fs/promises';
import type { PermissionMode, Risk } from './types.js';
import { FouadError } from './errors.js';
const SECRET = /(?:sk-[A-Za-z0-9_-]{12,}|api[_-]?key\s*[=:]\s*\S+|password\s*[=:]\s*\S+)/gi;
export const redact = (value: string): string => value.replace(SECRET, '[REDACTED]');
export async function safePath(workspace: string, input: string, write = false): Promise<string> {
  const root = await realpath(workspace);
  const candidate = path.resolve(root, input);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`))
    throw new FouadError('PATH_ESCAPE', 'Path is outside workspace');
  const parent = write ? path.dirname(candidate) : candidate;
  let resolved: string;
  try {
    resolved = await realpath(parent);
  } catch {
    resolved = await realpath(path.dirname(parent));
  }
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
    throw new FouadError('SYMLINK_ESCAPE', 'Symlink escapes workspace');
  if (!write) {
    const info = await lstat(candidate);
    if (info.isSymbolicLink()) {
      const target = await realpath(candidate);
      if (!target.startsWith(`${root}${path.sep}`))
        throw new FouadError('SYMLINK_ESCAPE', 'Symlink escapes workspace');
    }
  }
  return candidate;
}
const destructive = /^(?:rm|rmdir|mkfs|dd|shutdown|reboot|format|diskpart)$/i;
const obfuscated = /\b(?:base64\s+-d|eval|bash\s+-c|sh\s+-c|powershell.*encodedcommand)\b/i;
export function classifyCommand(executable: string, args: string[]): Risk {
  if (
    destructive.test(path.basename(executable)) ||
    obfuscated.test([executable, ...args].join(' '))
  )
    return 'destructive';
  return /^(?:git|node|npm|pnpm|npx|vitest|eslint|prettier|tsc)$/i.test(path.basename(executable))
    ? 'safe'
    : 'write';
}
export function assertAllowed(mode: PermissionMode, risk: Risk): void {
  if (mode === 'read-only' && risk !== 'safe')
    throw new FouadError('PERMISSION', 'Command denied in read-only mode');
  if (risk === 'destructive')
    throw new FouadError(
      'APPROVAL_REQUIRED',
      'Destructive or obfuscated command requires explicit approval',
    );
}
