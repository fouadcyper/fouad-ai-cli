import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'apps/web/dist/**',
      'coverage/**',
      'release/**',
      'training/.venv/**',
      'worker/worker-configuration.d.ts',
      'apps/platform-worker/worker-configuration.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
