import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config.js';
import { effectiveConfig } from '../src/provider-selection.js';

describe('provider selection', () => {
  it('uses Gemini when a key exists even if an old local provider was saved', () => {
    const oldLocal = {
      ...defaultConfig(),
      provider: 'llama-local',
      model: 'qwen3-4b-q4km',
      modelPath: '/models/qwen.gguf',
    };
    const selected = effectiveConfig(oldLocal, { GEMINI_API_KEY: 'present' });
    expect(selected.provider).toBe('gemini');
    expect(selected.model).toBe('gemini-3.1-flash-lite');
  });
  it('preserves local selection when Gemini is not exported', () => {
    const local = { ...defaultConfig(), provider: 'llama-local', model: 'qwen3' };
    expect(effectiveConfig(local, {}).provider).toBe('llama-local');
  });
});
