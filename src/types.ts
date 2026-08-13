export type Locale = 'ar' | 'en';
export type PermissionMode = 'read-only' | 'workspace-write' | 'full-access';
export type Risk = 'safe' | 'write' | 'network' | 'destructive';
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}
export interface ChatChunk {
  text: string;
  usage?: Usage;
  done?: boolean;
}
export interface ModelCapabilities {
  contextLength: number;
  tools: boolean;
  vision: boolean;
  embeddings: boolean;
}
export interface Provider {
  readonly id: string;
  health(signal?: AbortSignal): Promise<{ ok: boolean; detail: string }>;
  models(signal?: AbortSignal): Promise<string[]>;
  capabilities(model: string): Promise<ModelCapabilities>;
  stream(messages: ChatMessage[], model: string, signal?: AbortSignal): AsyncIterable<ChatChunk>;
}
