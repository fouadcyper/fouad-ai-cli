import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { safePath } from './security.js';
export const PluginManifest = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  license: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().optional(),
  minimumCliVersion: z.string(),
  entrypoint: z.string(),
  capabilities: z.array(z.string()),
  permissions: z.array(z.string()),
  commands: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  providers: z.array(z.string()).default([]),
  hooks: z.array(z.string()).default([]),
  settingsSchema: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(false),
});
export async function inspectPlugin(directory: string) {
  return PluginManifest.parse(
    JSON.parse(await readFile(path.join(directory, 'fouad.plugin.json'), 'utf8')),
  );
}
export async function createPlugin(workspace: string, name: string) {
  const dir = await safePath(workspace, name, true);
  await mkdir(dir, { recursive: false });
  const manifest = {
    id: name,
    name,
    version: '0.1.0',
    description: 'FOUAD AI plugin',
    author: 'Your name',
    license: 'Apache-2.0',
    minimumCliVersion: '0.1.0',
    entrypoint: 'index.js',
    capabilities: [],
    permissions: [],
    commands: [],
    tools: [],
    providers: [],
    hooks: [],
    settingsSchema: {},
    enabled: false,
  };
  await writeFile(path.join(dir, 'fouad.plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    path.join(dir, 'index.js'),
    "export default { activate(api) { api.log('Hello from FOUAD AI'); } };\n",
  );
}
export const SkillMetadata = z.object({
  name: z.string(),
  description: z.string().default(''),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(false),
});
export async function validateSkill(directory: string) {
  const md = await readFile(path.join(directory, 'SKILL.md'), 'utf8');
  if (!md.trim()) throw new Error('SKILL.md is empty');
  let meta = { name: path.basename(directory), description: '', priority: 0, enabled: false };
  try {
    meta = SkillMetadata.parse(
      JSON.parse(await readFile(path.join(directory, 'skill.json'), 'utf8')),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  return { ...meta, instructions: md };
}
export async function discoverSkills(root: string) {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return (
    await Promise.all(
      entries
        .filter((e) => e.isDirectory())
        .map((e) => validateSkill(path.join(root, e.name)).catch(() => null)),
    )
  ).filter(Boolean);
}
export async function createSkill(workspace: string, name: string) {
  const dir = await safePath(workspace, name, true);
  await mkdir(dir);
  await writeFile(
    path.join(dir, 'SKILL.md'),
    `# ${name}\n\nDescribe safe, focused instructions here. Scripts still require normal approval.\n`,
  );
  await writeFile(
    path.join(dir, 'skill.json'),
    `${JSON.stringify({ name, description: 'FOUAD AI skill', priority: 0, enabled: false }, null, 2)}\n`,
  );
}
