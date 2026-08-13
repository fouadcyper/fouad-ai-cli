import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  build: { outDir: fileURLToPath(new URL('./dist', import.meta.url)), sourcemap: true },
});
