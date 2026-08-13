import { describe, expect, it, vi } from 'vitest';
import { autocompleteSlash, filterSlash, parseSlash, suggestSlash } from '../src/slash.js';
import { executeSlash, type SlashContext } from '../src/slash-actions.js';
import { defaultConfig } from '../src/config.js';
import type { Hardware } from '../src/hardware.js';
const hardware: Hardware = {
  os: 'linux',
  arch: 'x64',
  cpu: 'test',
  cores: 4,
  ramBytes: 8e9,
  freeDiskBytes: 20e9,
  gpu: null,
  acceleration: [],
  colorDepth: 24,
};
const context = (): SlashContext => ({
  config: defaultConfig(),
  cwd: process.cwd(),
  hardware,
  providerId: 'mock-test-only',
  sessionCount: 1,
  pluginCount: 0,
  skillCount: 0,
  mcpCount: 0,
  toolCount: 5,
  clear: vi.fn(),
  quit: vi.fn(),
  newSession: vi.fn(async () => {}),
});
describe('slash commands', () => {
  it('parses args without becoming model text', () =>
    expect(parseSlash('/config language ar')).toEqual({
      command: '/config',
      args: ['language', 'ar'],
      raw: '/config language ar',
    }));
  it('filters /mo', () =>
    expect(filterSlash('/mo').map((x) => x.name)).toEqual(['/model', '/models']));
  it('autocompletes selection', () => expect(autocompleteSlash('/mo', 1)).toBe('/models'));
  it('suggests typo', () => expect(suggestSlash('/modle')).toBe('/model'));
  it('executes help', async () =>
    expect(await executeSlash('/help', context())).toContain('/models'));
  it('does not fake an unknown command', async () =>
    expect(await executeSlash('/modle', context())).toContain('Did you mean: /model?'));
  it('executes clear callback', async () => {
    const ctx = context();
    await executeSlash('/clear', ctx);
    expect(ctx.clear).toHaveBeenCalledOnce();
  });
});
