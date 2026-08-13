import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Config } from './config.js';
import { saveConfig } from './config.js';
import { SLASH_COMMANDS, parseSlash, suggestSlash } from './slash.js';
import { modelStatus } from './runtime.js';
import type { Hardware } from './hardware.js';
export interface SlashContext {
  config: Config;
  cwd: string;
  hardware: Hardware;
  providerId: string;
  sessionCount: number;
  pluginCount: number | null;
  skillCount: number | null;
  mcpCount: number | null;
  toolCount: number;
  clear(): void;
  quit(): void;
  newSession(): Promise<void>;
}
export async function executeSlash(value: string, ctx: SlashContext): Promise<string> {
  const parsed = parseSlash(value);
  if (!parsed) return '';
  const command = SLASH_COMMANDS.find(
    (c) => c.name === parsed.command || c.alias === parsed.command,
  );
  if (!command) {
    const suggestion = suggestSlash(parsed.command);
    return `Unknown command: ${parsed.command}${suggestion ? `\nDid you mean: ${suggestion}?` : ''}`;
  }
  switch (command.name) {
    case '/help':
      return (
        SLASH_COMMANDS.map(
          (c) => `${c.name.padEnd(14)} ${c.description}${c.alias ? ` (${c.alias})` : ''}`,
        ).join('\n') + '\n\nCtrl+K palette · Ctrl+P models · Ctrl+O sessions · ? shortcuts'
      );
    case '/clear':
      ctx.clear();
      return '';
    case '/quit':
      ctx.quit();
      return 'Exiting safely…';
    case '/new':
      await ctx.newSession();
      return 'New local session created.';
    case '/sessions':
      return `Local sessions: ${ctx.sessionCount}`;
    case '/models':
      return `Active: ${ctx.config.model}\nPath: ${ctx.config.modelPath ?? 'not installed'}\nState: ${await modelStatus(ctx.config)}\nUnderlying model: Qwen (FOUAD AI is the interface brand).`;
    case '/model':
      return modelCommand(parsed.args, ctx);
    case '/provider':
      return `Provider: ${ctx.providerId}\nCloud fallback: disabled`;
    case '/plugins':
      return `Plugins: ${ctx.pluginCount === null ? 'loading' : ctx.pluginCount} registered`;
    case '/skills':
      return `Skills: ${ctx.skillCount === null ? 'loading' : ctx.skillCount} discovered`;
    case '/mcp':
      return `MCP servers: ${ctx.mcpCount === null ? 'loading' : ctx.mcpCount} configured`;
    case '/tools':
      return `Validated tools: ${ctx.toolCount}`;
    case '/config':
      return configCommand(parsed.args, ctx);
    case '/theme':
      return `Theme: ${ctx.config.theme}\nFOUAD Neon is rendered inside the alternate screen; terminal settings are unchanged.`;
    case '/status':
      return `Model: ${await modelStatus(ctx.config)}\nProvider: ${ctx.providerId}\nPermission: ${ctx.config.permissionMode}\nHistory: ${ctx.config.history ? 'enabled' : 'disabled'}`;
    case '/context':
      return `Context window: ${ctx.config.context} tokens`;
    case '/compact':
      return 'Context compaction is available when the configured context limit is reached.';
    case '/init':
      await mkdir(path.join(ctx.cwd, '.fouad'), { recursive: true });
      return `Initialized ${path.join(ctx.cwd, '.fouad')}`;
    case '/memory':
      return `History: ${ctx.config.history ? 'enabled locally' : 'disabled'}; telemetry: off`;
    case '/permissions':
      return `Mode: ${ctx.config.permissionMode}\nApproval: ${ctx.config.approval}`;
    case '/system':
      return `${ctx.hardware.os}/${ctx.hardware.arch} · ${ctx.hardware.cpu}\nRAM ${(ctx.hardware.ramBytes / 2 ** 30).toFixed(1)} GiB · color depth ${ctx.hardware.colorDepth}`;
    case '/persona':
      return 'Persona is configuration, never model weights. No implicit system persona is written.';
    case '/doctor':
      return `Node ${process.version}\nModel ${await modelStatus(ctx.config)}\nData is local; run fouad doctor for the full report.`;
    case '/export': {
      const file = path.join(ctx.cwd, `fouad-session-${Date.now()}.md`);
      await writeFile(file, '# FOUAD AI session\n\nExport requested from TUI.\n');
      return `Exported ${file}`;
    }
    case '/update':
      return 'Review release notes, then run npm install -g fouad-ai@latest. No automatic update was performed.';
    case '/about':
      return 'FOUAD AI CLI 0.1.0\nLocal-first interface. Active model remains separately attributed to Qwen.\nhttps://about.fouadzulof26.workers.dev/';
    case '/login':
      return 'Run `fouad login` outside the TUI to complete secure browser authorization.';
    case '/logout':
      return 'Run `fouad logout` outside the TUI to revoke and remove local credentials.';
    case '/whoami':
      return 'Run `fouad whoami` to inspect the linked account without exposing tokens.';
    case '/account':
      return 'Dashboard: https://fouad-cli-platform.fouadzulof26.workers.dev/dashboard';
    case '/devices':
      return 'Devices: https://fouad-cli-platform.fouadzulof26.workers.dev/devices';
    default:
      return `${command.name} requires an argument or an interactive selector.`;
  }
}
async function modelCommand(args: string[], ctx: SlashContext): Promise<string> {
  const action = args[0] ?? 'status';
  if (action === 'list' || action === 'status')
    return `Model ${ctx.config.model}: ${await modelStatus(ctx.config)}\n${ctx.config.modelPath ?? 'No GGUF installed'}`;
  if (action === 'install')
    return 'Run `fouad setup` to review license, size, and confirm the resumable download.';
  if (action === 'use') return 'Use `fouad models use <id>` after importing a verified GGUF.';
  if (action === 'remove') return 'Removal requires exact-target confirmation in the CLI.';
  return `Unknown model action: ${action}`;
}
async function configCommand(args: string[], ctx: SlashContext): Promise<string> {
  if (args[0] === 'language' && (args[1] === 'en' || args[1] === 'ar')) {
    await saveConfig({ ...ctx.config, locale: args[1] });
    return `Language saved: ${args[1]} (restart TUI to apply all labels).`;
  }
  return `Language: ${ctx.config.locale}\nTheme: ${ctx.config.theme}\nUsage: /config language en|ar`;
}
