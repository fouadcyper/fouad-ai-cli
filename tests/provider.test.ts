import { describe, expect, it } from 'vitest';
import { MockProvider } from '../src/mock-provider.js';
describe('streaming provider', () => {
  it('streams a clearly marked test response', async () => {
    const provider = new MockProvider('مرحبا mixed text');
    let result = '';
    for await (const chunk of provider.stream(
      [{ role: 'user', content: 'اختبار عربي English' }],
      'mock',
    ))
      result += chunk.text;
    expect(result).toBe('مرحبا mixed text ');
  });
  it('honors cancellation', async () => {
    const provider = new MockProvider('one two', 1);
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    await expect(async () => {
      for await (const chunk of provider.stream(
        [{ role: 'user', content: 'x' }],
        'mock',
        controller.signal,
      )) {
        void chunk;
      }
    }).rejects.toThrow('cancelled');
  });
});
