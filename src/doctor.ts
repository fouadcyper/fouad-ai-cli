import { access } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { paths } from './paths.js';
import { loadConfig } from './config.js';
import { detectHardware } from './hardware.js';
import { modelStatus } from './runtime.js';
const execFileAsync = promisify(execFile);
export interface Check {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
}
async function executable(name: string) {
  try {
    return (
      (
        await execFileAsync(process.platform === 'win32' ? 'where' : 'which', [name], {
          timeout: 1500,
        })
      ).stdout
        .trim()
        .split('\n')[0] ?? null
    );
  } catch {
    return null;
  }
}
export async function runDoctor(): Promise<Check[]> {
  const config = await loadConfig();
  const hw = await detectHardware();
  const checks: Check[] = [];
  checks.push({
    name: 'Node 22+',
    ok: Number(process.versions.node.split('.')[0]) >= 22,
    detail: process.version,
  });
  const cli = await executable('fouad');
  checks.push({
    name: 'CLI executable',
    ok: Boolean(cli),
    detail: cli ?? 'not found in PATH',
    fix: `export PATH="${path.dirname(process.execPath)}:$PATH"`,
  });
  checks.push({
    name: 'PATH',
    ok: (process.env.PATH ?? '').split(path.delimiter).includes(path.dirname(process.execPath)),
    detail: path.dirname(process.execPath),
  });
  for (const [name, dir] of Object.entries(paths)) {
    try {
      await access(dir, constants.R_OK | constants.W_OK);
      checks.push({ name: `${name} directory`, ok: true, detail: dir });
    } catch {
      checks.push({
        name: `${name} directory`,
        ok: false,
        detail: `${dir} · missing or not writable`,
        fix: `Create this directory only after explicit approval: ${dir}`,
      });
    }
  }
  const runtime = await executable('llama-server');
  checks.push({
    name: 'llama.cpp runtime',
    ok: Boolean(runtime),
    detail: runtime ?? 'llama-server not found',
  });
  const state = await modelStatus(config);
  checks.push({
    name: 'model',
    ok: state === 'installed' || state === 'ready',
    detail: `${state}${config.modelPath ? ` · ${config.modelPath}` : ''}`,
  });
  checks.push({
    name: 'backend health',
    ok: state === 'ready',
    detail: state === 'ready' ? 'http://127.0.0.1:8080 ready' : 'not running',
  });
  checks.push({
    name: 'RAM',
    ok: hw.ramBytes >= 4e9,
    detail: `${(hw.ramBytes / 2 ** 30).toFixed(1)} GiB`,
  });
  checks.push({
    name: 'disk',
    ok: hw.freeDiskBytes >= 4e9,
    detail: `${(hw.freeDiskBytes / 2 ** 30).toFixed(1)} GiB free`,
  });
  checks.push({
    name: 'terminal colors',
    ok: hw.colorDepth >= 8,
    detail: `depth ${hw.colorDepth}${process.env.NO_COLOR !== undefined ? ' · NO_COLOR' : ''}`,
  });
  return checks;
}
export function formatDoctor(checks: Check[]) {
  return checks
    .map(
      (c) =>
        `${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(20)} ${c.detail}${!c.ok && c.fix ? `\n      suggested: ${c.fix}` : ''}`,
    )
    .join('\n');
}
