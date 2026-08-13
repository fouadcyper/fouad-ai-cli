import { describe, expect, it } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
describe('built executable', () => {
  it('has package bin and shebang', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
      bin: { fouad: string };
    };
    expect(pkg.bin.fouad).toBe('dist/cli.js');
    expect((await readFile('dist/cli.js', 'utf8')).startsWith('#!/usr/bin/env node')).toBe(true);
    if (process.platform !== 'win32')
      expect((await stat(path.resolve('dist/cli.js'))).mode & 0o111).not.toBe(0);
  });
});
