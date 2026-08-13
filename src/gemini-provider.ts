import { z } from 'zod';
import { FouadError } from './errors.js';
import type { ChatChunk, ChatMessage, ModelCapabilities, Provider } from './types.js';

const ListSchema = z.object({ models: z.array(z.object({ name: z.string() })).default([]) });
const StreamSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }).optional(),
      }),
    )
    .default([]),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      candidatesTokenCount: z.number().optional(),
    })
    .optional(),
});

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

export class GeminiProvider implements Provider {
  readonly id = 'gemini';
  constructor(private readonly apiKey: string | undefined = process.env.GEMINI_API_KEY) {}
  static withoutCredentials(): GeminiProvider {
    return new GeminiProvider('');
  }
  private headers(): Record<string, string> {
    if (!this.apiKey)
      throw new FouadError(
        'GEMINI_KEY_MISSING',
        'GEMINI_API_KEY is not set.',
        'Create a new key, then export GEMINI_API_KEY in the current shell. Keys are never stored in project files.',
      );
    return { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey };
  }
  async health(signal?: AbortSignal) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: this.headers(),
        ...(signal ? { signal } : {}),
      });
      return {
        ok: response.ok,
        detail: response.ok ? 'Gemini API ready' : `Gemini HTTP ${response.status}`,
      };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }
  async models(signal?: AbortSignal): Promise<string[]> {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: this.headers(),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) throw new FouadError('GEMINI_HTTP', `Gemini HTTP ${response.status}`);
    return ListSchema.parse(await response.json()).models.map((model) =>
      model.name.replace(/^models\//, ''),
    );
  }
  capabilities(model: string): Promise<ModelCapabilities> {
    void model;
    return Promise.resolve({
      contextLength: 1_000_000,
      tools: true,
      vision: true,
      embeddings: false,
    });
  }
  async *stream(
    messages: ChatMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncIterable<ChatChunk> {
    const contents = messages
      .filter((message) => message.role !== 'system' && message.role !== 'tool')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ contents }),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new FouadError(
        'GEMINI_HTTP',
        `Gemini HTTP ${response.status}: ${detail.slice(0, 300)}`,
      );
    }
    if (!response.body) throw new FouadError('GEMINI_EMPTY', 'Gemini returned no response stream.');
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    const parseEvent = (event: string) => {
      const data = event
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('');
      if (!data) return null;
      return StreamSchema.parse(JSON.parse(data));
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        const chunk = parseEvent(event);
        if (!chunk) continue;
        const text = chunk.candidates
          .flatMap((candidate) => candidate.content?.parts ?? [])
          .map((part) => part.text ?? '')
          .join('');
        if (text) yield { text };
        if (chunk.usageMetadata)
          yield {
            text: '',
            usage: {
              inputTokens: chunk.usageMetadata.promptTokenCount ?? 0,
              outputTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
            },
          };
      }
    }
    const finalChunk = parseEvent(buffer.trim());
    if (finalChunk) {
      const text = finalChunk.candidates
        .flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('');
      if (text) yield { text };
    }
    yield { text: '', done: true };
  }
}
