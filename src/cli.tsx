#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { App } from './tui.js';
import { loadConfig, saveConfig, ConfigSchema } from './config.js';
import { detectHardware } from './hardware.js';
import { setup } from './setup.js';
import { localProvider, ollamaProvider, OpenAICompatibleProvider } from './providers.js';
import { createPlugin, createSkill, inspectPlugin, validateSkill } from './extensions.js';
import { paths } from './paths.js';
import { Sessions } from './sessions.js';
import { normalizeError } from './errors.js';
import { runDoctor, formatDoctor } from './doctor.js';
import { LocalRuntime } from './runtime.js';
import { createCoreTools } from './core-tools.js';
import { GeminiProvider, DEFAULT_GEMINI_MODEL } from './gemini-provider.js';
import { effectiveConfig } from './provider-selection.js';
import { createCloudSync } from './cloud-sync.js';
import {
  account as showAccount,
  devices as showDevices,
  login,
  logout,
  whoami,
} from './account.js';
import { readdir } from 'node:fs/promises';
const execFileAsync = promisify(execFile);
const program = new Command();
program
  .name('fouad')
  .description('FOUAD AI CLI — private bilingual AI coding assistant')
  .version('0.1.0')
  .option('--safe-mode', 'disable all plugins')
  .option('--no-color', 'disable color');
async function branch() {
  try {
    return (
      (
        await execFileAsync('git', ['branch', '--show-current'], {
          cwd: process.cwd(),
          timeout: 1000,
        })
      ).stdout.trim() || 'detached'
    );
  } catch {
    return '—';
  }
}
async function tui() {
  let config = await loadConfig();
  config = effectiveConfig(config, process.env);
  if (
    config.provider === 'llama-local' &&
    !config.modelPath &&
    process.env.FOUAD_SKIP_SETUP !== '1'
  ) {
    await setup();
    config = await loadConfig();
  }
  const hardware = await detectHardware();
  const runtime = new LocalRuntime();
  if (config.provider === 'llama-local' && config.modelPath) await runtime.start(config);
  const countDirectories = async (directory: string) =>
    (await readdir(directory, { withFileTypes: true }).catch(() => [])).filter((entry) =>
      entry.isDirectory(),
    ).length;
  const counts = {
    plugins: await countDirectories(path.join(paths.data, 'plugins')),
    skills: await countDirectories(path.join(paths.data, 'skills')),
    mcp: 0,
    tools: createCoreTools(process.cwd()).list().length,
  };
  const activeProvider =
    config.provider === 'gemini'
      ? new GeminiProvider()
      : config.provider === 'ollama'
        ? ollamaProvider()
        : localProvider();
  const cloud = createCloudSync(process.env);
  const cloudStatus = cloud ? await cloud.connect() : null;
  const instance = render(
    <App
      config={config}
      hardware={hardware}
      cwd={process.cwd()}
      branch={await branch()}
      provider={activeProvider}
      counts={counts}
      cloud={cloudStatus?.ok ? cloud : null}
      cloudState={cloudStatus?.ok ? 'synced' : cloud ? 'auth-failed' : 'local'}
    />,
  );
  await instance.waitUntilExit();
  await runtime.stop();
}
program.action(tui);
program
  .command('setup')
  .option('--force')
  .action(async (o) => {
    await setup(Boolean(o.force));
  });
program.command('chat').action(tui);
program.command('login').description('Link this CLI through the browser').action(login);
program
  .command('logout')
  .description('Revoke the session and remove local credentials')
  .action(logout);
program.command('whoami').description('Show the linked account').action(whoami);
program.command('account').description('Show the account dashboard URL').action(showAccount);
program.command('devices').description('List linked CLI devices').action(showDevices);
program
  .command('ask <question>')
  .option('--provider <id>', 'gemini|llama-local|ollama|openai-compatible')
  .option('--base-url <url>')
  .option('--model <model>')
  .action(async (q, o) => {
    const cfg = await loadConfig();
    const selected = o.provider ?? (process.env.GEMINI_API_KEY ? 'gemini' : cfg.provider);
    const provider =
      selected === 'gemini'
        ? new GeminiProvider()
        : selected === 'ollama'
          ? ollamaProvider()
          : o.provider === 'openai-compatible'
            ? new OpenAICompatibleProvider('custom', o.baseUrl, process.env.FOUAD_API_KEY)
            : localProvider();
    const model = o.model ?? (selected === 'gemini' ? DEFAULT_GEMINI_MODEL : cfg.model);
    for await (const chunk of provider.stream([{ role: 'user', content: q }], model))
      process.stdout.write(chunk.text);
    process.stdout.write('\n');
  });
program.command('init').action(async () => {
  await mkdir('.fouad', { recursive: true });
  console.log('Created .fouad project configuration directory.');
});
program
  .command('doctor')
  .option('--fix')
  .action(async (o) => {
    const checks = await runDoctor();
    console.log(formatDoctor(checks));
    if (o.fix)
      console.log('\nNo fix was applied. Review each suggested command and confirm it separately.');
  });
program
  .command('update')
  .action(() =>
    console.log(
      'Updates are never installed silently. Use npm install -g fouad-ai@latest after reviewing release notes.',
    ),
  );
program
  .command('uninstall')
  .action(() =>
    console.log(
      `Preview only. Remove package with your package manager. User data remains at ${paths.data}.`,
    ),
  );
const models = program.command('models');
models.command('list').action(async () => console.log((await loadConfig()).model));
models.command('available').action(() => console.log('qwen3-4b-q4km\ncustom local GGUF'));
models.command('import <file>').action(async (file) => {
  const source = path.resolve(file);
  const target = path.join(paths.data, 'models', path.basename(file));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  const cfg = await loadConfig();
  await saveConfig({ ...cfg, model: path.parse(file).name, modelPath: target });
  console.log(`Imported ${target}`);
});
for (const name of ['add', 'pull', 'use', 'info', 'verify', 'benchmark', 'remove', 'doctor'])
  models
    .command(`${name} [value]`)
    .action((v) =>
      console.log(
        `${name}: ${v ?? ''} (use /models in TUI; destructive actions require confirmation)`,
      ),
    );
const providers = program.command('providers');
providers
  .command('list')
  .action(() => console.log('gemini (free-tier capable)\nllama-local\nollama\nopenai-compatible'));
providers.command('test [id]').action(async (id = 'gemini') => {
  const provider =
    id === 'gemini' ? new GeminiProvider() : id === 'ollama' ? ollamaProvider() : localProvider();
  const result = await provider.health();
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${provider.id}: ${result.detail}`);
  if (!result.ok) process.exitCode = 1;
});
providers.command('configure <id>').action(async (id) => {
  if (id !== 'gemini') throw new Error(`Unsupported provider: ${id}`);
  const current = await loadConfig();
  await saveConfig({ ...current, provider: 'gemini', model: DEFAULT_GEMINI_MODEL });
  console.log(
    'Gemini selected. The API key was not stored. Export GEMINI_API_KEY before running fouad.',
  );
});
for (const name of ['add', 'remove'])
  providers
    .command(`${name} [value]`)
    .action((v) =>
      console.log(
        `${name}: ${v ?? ''}; cloud providers stay disabled until explicitly configured.`,
      ),
    );
const plugins = program.command('plugins');
plugins.command('create <name>').action(createPlugin.bind(null, process.cwd()));
plugins
  .command('inspect <dir>')
  .action(async (d) => console.log(JSON.stringify(await inspectPlugin(path.resolve(d)), null, 2)));
for (const name of ['list', 'search', 'install', 'enable', 'disable', 'update', 'remove', 'doctor'])
  plugins
    .command(`${name} [value]`)
    .action((v) => console.log(`${name}: ${v ?? ''}; installed plugins are disabled by default.`));
const skills = program.command('skills');
skills.command('create <name>').action(createSkill.bind(null, process.cwd()));
skills
  .command('validate <dir>')
  .action(async (d) => console.log(JSON.stringify(await validateSkill(path.resolve(d)), null, 2)));
for (const name of ['list', 'add', 'inspect', 'enable', 'disable', 'reload', 'remove'])
  skills.command(`${name} [value]`).action((v) => console.log(`${name}: ${v ?? ''}`));
const mcp = program.command('mcp');
for (const name of [
  'list',
  'add',
  'inspect',
  'connect',
  'tools',
  'enable',
  'disable',
  'remove',
  'doctor',
])
  mcp
    .command(`${name} [value]`)
    .action((v) =>
      console.log(`${name}: ${v ?? ''}; only explicitly mapped environment variables are passed.`),
    );
const config = program.command('config');
config.command('list').action(async () => console.log(JSON.stringify(await loadConfig(), null, 2)));
config
  .command('get <key>')
  .action(async (k) =>
    console.log((await loadConfig())[k as keyof Awaited<ReturnType<typeof loadConfig>>]),
  );
config.command('set <key> <value>').action(async (k, v) => {
  const current = await loadConfig();
  const parsed = ConfigSchema.parse({ ...current, [k]: v });
  await saveConfig(parsed);
});
for (const name of ['edit', 'validate', 'reset'])
  config
    .command(name)
    .action(() => console.log(`${name}: explicit interactive operation required.`));
const sessions = program.command('sessions');
sessions.command('list').action(async () => {
  const s = new Sessions();
  await s.open();
  console.log(s.list());
  s.close();
});
for (const name of ['open', 'rename', 'export', 'delete'])
  sessions
    .command(`${name} [id]`)
    .action((id) => console.log(`${name}: ${id ?? ''}; deletion requires confirmation.`));
const cloud = program.command('cloud').description('Supabase session synchronization');
cloud.command('status').action(async () => {
  const sync = createCloudSync(process.env);
  if (!sync) {
    console.log(
      'DISABLED cloud sync: set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_ACCESS_TOKEN.',
    );
    return;
  }
  const result = await sync.connect();
  console.log(`${result.ok ? 'READY' : 'FAIL'} supabase: ${result.detail}`);
  if (!result.ok) process.exitCode = 1;
});
cloud.command('sessions').action(async () => {
  const sync = createCloudSync(process.env);
  if (!sync) throw new Error('Supabase cloud sync is not configured. Run fouad cloud status.');
  const status = await sync.connect();
  if (!status.ok) throw new Error(`Supabase authentication failed: ${status.detail}`);
  console.log(JSON.stringify(await sync.listSessions(), null, 2));
});
program.parseAsync().catch((error) => {
  const e = normalizeError(error);
  console.error(`FOUAD ${e.code}: ${e.message}${e.hint ? `\n${e.hint}` : ''}`);
  process.exitCode = 1;
});
