import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new globalThis.URL('../apps/web/dist/', import.meta.url));
await rm(outputDirectory, { recursive: true, force: true });
