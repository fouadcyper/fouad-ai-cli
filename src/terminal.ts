import type { WriteStream } from 'node:tty';
export const ANSI = {
  enter: '\u001b[?1049h\u001b[?25l\u001b[2J\u001b[H',
  leave: '\u001b[0m\u001b[?25h\u001b[?1049l',
} as const;
export function enterTerminal(stdout: WriteStream): () => void {
  stdout.write(ANSI.enter);
  let active = true;
  return () => {
    if (active) {
      active = false;
      stdout.write(ANSI.leave);
    }
  };
}
