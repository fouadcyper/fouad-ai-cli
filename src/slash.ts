export interface SlashCommand {
  name: string;
  description: string;
  alias?: string;
}

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  { name: '/help', alias: '/?', description: 'Show commands and keyboard shortcuts' },
  { name: '/clear', description: 'Clear the visible conversation' },
  { name: '/new', description: 'Start a new local session' },
  { name: '/resume', description: 'Resume a session by ID' },
  { name: '/sessions', description: 'List local sessions' },
  { name: '/model', description: 'Install, list, use, remove, or inspect a model' },
  { name: '/models', description: 'List models and installation state' },
  { name: '/provider', description: 'Show or select the active provider' },
  { name: '/plugins', description: 'Show plugin registry status' },
  { name: '/skills', description: 'Show discovered skills' },
  { name: '/mcp', description: 'Show MCP server status' },
  { name: '/tools', description: 'Show validated tools' },
  { name: '/config', description: 'Read or change validated configuration' },
  { name: '/theme', description: 'Show or select the TUI theme' },
  { name: '/status', description: 'Show runtime, model, and backend state' },
  { name: '/context', description: 'Show context usage' },
  { name: '/compact', description: 'Compact the current conversation' },
  { name: '/init', description: 'Initialize project instructions' },
  { name: '/memory', description: 'Show local memory policy' },
  { name: '/permissions', description: 'Show permission mode and approval policy' },
  { name: '/system', description: 'Show system and terminal information' },
  { name: '/persona', description: 'Show the editable persona location' },
  { name: '/doctor', description: 'Run read-only diagnostics' },
  { name: '/export', description: 'Export the current session' },
  { name: '/update', description: 'Check update instructions' },
  { name: '/about', description: 'Show attribution and project information' },
  { name: '/login', description: 'Link this CLI through the browser' },
  { name: '/logout', description: 'Revoke the linked account session' },
  { name: '/whoami', description: 'Show the linked account' },
  { name: '/account', description: 'Show the account dashboard' },
  { name: '/devices', description: 'Show linked CLI devices' },
  { name: '/quit', alias: '/exit', description: 'Exit safely' },
] as const;

export interface ParsedSlash {
  command: string;
  args: string[];
  raw: string;
}

export function parseSlash(value: string): ParsedSlash | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const command = (parts.shift() ?? '/').toLowerCase();
  return { command, args: parts.map((part) => part.replace(/^"|"$/g, '')), raw: trimmed };
}

export function filterSlash(query: string): SlashCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle.startsWith('/')) return [];
  return SLASH_COMMANDS.filter(
    (item) => item.name.startsWith(needle) || item.alias?.startsWith(needle),
  );
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = saved;
    }
  }
  return row[b.length] ?? Infinity;
}

export function suggestSlash(command: string): string | null {
  const ranked = SLASH_COMMANDS.map((item) => ({
    name: item.name,
    score: distance(command, item.name),
  })).sort((a, b) => a.score - b.score);
  return ranked[0] && ranked[0].score <= 3 ? ranked[0].name : null;
}

export function autocompleteSlash(query: string, selected = 0): string {
  const matches = filterSlash(query);
  return matches[selected]?.name ?? query;
}
