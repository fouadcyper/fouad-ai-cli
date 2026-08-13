import { describe, expect, it } from 'vitest';
import { ConfigSchema } from '../src/config.js';
describe('config', () => {
  it('defaults privacy safely', () => {
    const c = ConfigSchema.parse({});
    expect(c.telemetry).toBe(false);
    expect(c.permissionMode).toBe('workspace-write');
    expect(c.provider).toBe('gemini');
    expect(c.model).toBe('gemini-3.1-flash-lite');
  });
  it('rejects telemetry', () => expect(() => ConfigSchema.parse({ telemetry: true })).toThrow());
});
