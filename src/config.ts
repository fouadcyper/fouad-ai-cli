import { mkdir, readFile, rename, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { paths } from './paths.js';
export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  locale: z.enum(['ar', 'en']).default('ar'),
  theme: z.string().default('fouad-neon'),
  provider: z.string().default('gemini'),
  model: z.string().default('gemini-3.1-flash-lite'),
  permissionMode: z
    .enum(['read-only', 'workspace-write', 'full-access'])
    .default('workspace-write'),
  approval: z.enum(['always-ask', 'ask-risky', 'auto-safe', 'deny-commands']).default('ask-risky'),
  history: z.boolean().default(true),
  telemetry: z.literal(false).default(false),
  offline: z.boolean().default(false),
  modelPath: z.string().optional(),
  context: z.number().int().min(512).max(131072).default(8192),
  temperature: z.number().min(0).max(2).default(0.3),
  maxTokens: z.number().int().positive().default(2048),
});
export type Config = z.infer<typeof ConfigSchema>;
export const defaultConfig = (): Config => ConfigSchema.parse({});
export async function loadConfig(): Promise<Config> {
  try {
    return ConfigSchema.parse(
      JSON.parse(await readFile(path.join(paths.config, 'config.json'), 'utf8')),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultConfig();
    throw error;
  }
}
export async function saveConfig(config: Config): Promise<void> {
  await mkdir(paths.config, { recursive: true });
  const file = path.join(paths.config, 'config.json');
  const tmp = `${file}.tmp`;
  try {
    await copyFile(file, `${file}.bak`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await writeFile(tmp, `${JSON.stringify(ConfigSchema.parse(config), null, 2)}\n`, { mode: 0o600 });
  await rename(tmp, file);
}
