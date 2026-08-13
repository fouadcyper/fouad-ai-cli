import { describe, expect, it } from 'vitest';
import { recommendModel } from '../src/models.js';
import type { Hardware } from '../src/hardware.js';
const hw = (ramBytes: number): Hardware => ({
  os: 'linux',
  arch: 'x64',
  cpu: 'test',
  cores: 4,
  ramBytes,
  freeDiskBytes: 1e11,
  gpu: null,
  acceleration: [],
  colorDepth: 8,
});
describe('model selection', () => {
  it('uses standard with enough RAM', () =>
    expect(recommendModel(hw(8e9)).profile).toBe('standard'));
  it('does not silently choose arbitrary low-RAM weights', () =>
    expect(recommendModel(hw(4e9)).id).toBe('custom-lite-required'));
});
