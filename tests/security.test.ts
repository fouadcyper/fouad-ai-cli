import { describe, expect, it } from 'vitest';
import { mkdtemp, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { safePath, classifyCommand, redact } from '../src/security.js';
describe('security', () => {
  it('blocks traversal', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'fouad-'));
    await expect(safePath(root, '../secret')).rejects.toMatchObject({ code: 'PATH_ESCAPE' });
  });
  it('blocks symlink escape', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'fouad-'));
    const outside = await mkdtemp(path.join(os.tmpdir(), 'outside-'));
    await symlink(outside, path.join(root, 'link'));
    await expect(safePath(root, 'link')).rejects.toMatchObject({ code: 'SYMLINK_ESCAPE' });
  });
  it('detects dangerous commands', () =>
    expect(classifyCommand('bash', ['-c', 'echo dGVzdA== | base64 -d'])).toBe('destructive'));
  it('redacts keys', () => expect(redact('api_key=secret-value')).not.toContain('secret-value'));
});
