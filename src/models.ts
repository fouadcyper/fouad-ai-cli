import { z } from 'zod';
import type { Hardware } from './hardware.js';
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string().url(),
  license: z.string(),
  filename: z.string(),
  size: z.number().positive(),
  ram: z.number().positive(),
  sha256: z
    .string()
    .regex(/^[a-f\d]{64}$/i)
    .optional(),
  profile: z.enum(['lite', 'standard', 'quality']),
});
export type Model = z.infer<typeof ModelSchema>;
export const MODELS: Model[] = [
  {
    id: 'qwen3-4b-q4km',
    name: 'Qwen3-4B Q4_K_M',
    source: 'https://huggingface.co/Qwen/Qwen3-4B-GGUF',
    license: 'Apache-2.0 (verify repository model card before redistribution)',
    filename: 'Qwen3-4B-Q4_K_M.gguf',
    size: 2_700_000_000,
    ram: 6_000_000_000,
    profile: 'standard',
  },
  {
    id: 'custom-lite-required',
    name: 'Lite model (manual verified manifest required)',
    source: 'https://huggingface.co/models',
    license: 'Model-specific',
    filename: 'lite.gguf',
    size: 1_000_000_000,
    ram: 3_000_000_000,
    profile: 'lite',
  },
];
export function recommendModel(hw: Hardware): Model {
  return hw.ramBytes >= 7_000_000_000 ? MODELS[0]! : MODELS[1]!;
}
export function formatBytes(n: number): string {
  const u = ['B', 'KiB', 'MiB', 'GiB'];
  let i = 0,
    v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}
