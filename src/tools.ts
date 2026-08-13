import { z } from 'zod';
import type { Risk } from './types.js';
import { FouadError } from './errors.js';
export interface Tool<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  source: 'core' | 'plugin' | 'mcp';
  input: T;
  risk: Risk;
  permissions: string[];
  timeoutMs: number;
  run: (input: z.output<T>, signal: AbortSignal) => Promise<unknown>;
}
export class ToolRegistry {
  private readonly tools = new Map<string, Tool<z.ZodTypeAny>>();
  register<T extends z.ZodTypeAny>(tool: Tool<T>) {
    if (this.tools.has(tool.name)) throw new FouadError('TOOL_DUPLICATE', tool.name);
    this.tools.set(tool.name, tool);
  }
  list() {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      source: tool.source,
      input: tool.input,
      risk: tool.risk,
      permissions: tool.permissions,
      timeoutMs: tool.timeoutMs,
    }));
  }
  async call(name: string, input: unknown, parent?: AbortSignal) {
    const tool = this.tools.get(name);
    if (!tool) throw new FouadError('TOOL_UNKNOWN', name);
    const parsed = tool.input.parse(input);
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), tool.timeoutMs);
    parent?.addEventListener('abort', () => c.abort(), { once: true });
    try {
      return await tool.run(parsed, c.signal);
    } finally {
      clearTimeout(timer);
    }
  }
}
