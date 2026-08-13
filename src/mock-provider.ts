import type { ChatChunk, ChatMessage, ModelCapabilities, Provider } from './types.js';
export class MockProvider implements Provider {
  readonly id = 'mock-test-only';
  constructor(
    private readonly response = 'Mock response',
    private readonly delay = 0,
  ) {}
  async health() {
    return { ok: true, detail: 'test mock ready' };
  }
  async models() {
    return ['mock-model'];
  }
  async capabilities(): Promise<ModelCapabilities> {
    return { contextLength: 1024, tools: false, vision: false, embeddings: false };
  }
  async *stream(
    messages: ChatMessage[],
    _model: string,
    signal?: AbortSignal,
  ): AsyncIterable<ChatChunk> {
    if (process.env.NODE_ENV !== 'test') throw new Error('MockProvider is test-only');
    if (messages.length === 0) throw new Error('message required');
    for (const word of this.response.split(' ')) {
      if (signal?.aborted) throw signal.reason ?? new Error('aborted');
      if (this.delay) await new Promise((resolve) => setTimeout(resolve, this.delay));
      yield { text: `${word} ` };
    }
    yield { text: '', done: true };
  }
}
