import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from '../src/gemini-provider.js';

afterEach(() => vi.unstubAllGlobals());
describe('Gemini provider', () => {
  it('never places the key in the URL and streams SSE', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).not.toContain('test-secret');
      expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('test-secret');
      const payload = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'مرحبا' }] } }] });
      const encoded = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoded.encode(`data: ${payload.slice(0, 20)}`));
            controller.enqueue(encoded.encode(`${payload.slice(20)}\r\n\r\n`));
            controller.close();
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GeminiProvider('test-secret');
    let output = '';
    for await (const chunk of provider.stream(
      [{ role: 'user', content: 'Arabic عربي English' }],
      'gemini-3.1-flash-lite',
    ))
      output += chunk.text;
    expect(output).toBe('مرحبا');
  });
  it('fails safely when the key is missing', async () => {
    const provider = GeminiProvider.withoutCredentials();
    expect((await provider.health()).ok).toBe(false);
  });
});
