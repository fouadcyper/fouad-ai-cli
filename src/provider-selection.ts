import type { Config } from './config.js';
import { DEFAULT_GEMINI_MODEL } from './gemini-provider.js';

export function effectiveConfig(config: Config, environment: NodeJS.ProcessEnv): Config {
  return environment.GEMINI_API_KEY
    ? { ...config, provider: 'gemini', model: DEFAULT_GEMINI_MODEL }
    : config;
}
