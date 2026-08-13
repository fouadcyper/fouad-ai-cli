import { z } from 'zod';
import { FouadError } from './errors.js';
import type { ChatChunk, ChatMessage, ModelCapabilities, Provider } from './types.js';
const ErrorSchema = z.object({ error: z.object({ message: z.string().optional() }).optional() });
export class OpenAICompatibleProvider implements Provider {
  readonly id: string;
  constructor(
    id: string,
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {
    this.id = id;
  }
  private headers() {
    return {
      'content-type': 'application/json',
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }
  async health(signal?: AbortSignal) {
    try {
      const r = await fetch(`${this.baseUrl}/models`, {
        headers: this.headers(),
        ...(signal ? { signal } : {}),
      });
      return { ok: r.ok, detail: r.ok ? 'ready' : `HTTP ${r.status}` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }
  async models(signal?: AbortSignal) {
    const r = await fetch(`${this.baseUrl}/models`, {
      headers: this.headers(),
      ...(signal ? { signal } : {}),
    });
    if (!r.ok) throw new FouadError('PROVIDER_HTTP', `HTTP ${r.status}`);
    const json = z.object({ data: z.array(z.object({ id: z.string() })) }).parse(await r.json());
    return json.data.map((x) => x.id);
  }
  capabilities(model: string): Promise<ModelCapabilities> {
    void model;
    return Promise.resolve({ contextLength: 8192, tools: true, vision: false, embeddings: false });
  }
  async *stream(
    messages: ChatMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncIterable<ChatChunk> {
    const r = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model, messages, stream: true }),
      ...(signal ? { signal } : {}),
    });
    if (!r.ok) {
      const body = ErrorSchema.safeParse(await r.json().catch(() => ({})));
      throw new FouadError(
        'PROVIDER_HTTP',
        body.success ? (body.data.error?.message ?? `HTTP ${r.status}`) : `HTTP ${r.status}`,
      );
    }
    if (!r.body) throw new FouadError('PROVIDER_EMPTY', 'Provider returned no stream');
    const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          yield { text: '', done: true };
          return;
        }
        const parsed = z
          .object({
            choices: z.array(
              z.object({ delta: z.object({ content: z.string().nullable().optional() }) }),
            ),
          })
          .safeParse(JSON.parse(data));
        if (parsed.success) {
          const text = parsed.data.choices[0]?.delta.content ?? '';
          if (text) yield { text };
        }
      }
    }
  }
}
export const localProvider = (port = 8080) =>
  new OpenAICompatibleProvider('llama-local', `http://127.0.0.1:${port}/v1`);
export const ollamaProvider = () =>
  new OpenAICompatibleProvider('ollama', 'http://127.0.0.1:11434/v1', 'ollama');
