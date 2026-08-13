import { describe, expect, it, vi } from 'vitest';
import { ANSI, enterTerminal } from '../src/terminal.js';
describe('terminal cleanup', () => {
  it('restores colors cursor and alternate screen once', () => {
    const write = vi.fn();
    const cleanup = enterTerminal({ write } as never);
    expect(write).toHaveBeenCalledWith(ANSI.enter);
    cleanup();
    cleanup();
    expect(write).toHaveBeenLastCalledWith(ANSI.leave);
    expect(write).toHaveBeenCalledTimes(2);
    expect(ANSI.leave).toContain('\u001b[0m');
    expect(ANSI.leave).toContain('?25h');
  });
});
