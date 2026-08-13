import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPlugin, createSkill, inspectPlugin, validateSkill } from '../src/extensions.js';
describe('extensions', () => {
  it('creates disabled plugin', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'fouad-p-'));
    await createPlugin(root, 'hello-plugin');
    expect((await inspectPlugin(path.join(root, 'hello-plugin'))).enabled).toBe(false);
  });
  it('creates valid skill', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'fouad-s-'));
    await createSkill(root, 'code-review');
    expect((await validateSkill(path.join(root, 'code-review'))).name).toBe('code-review');
  });
});
