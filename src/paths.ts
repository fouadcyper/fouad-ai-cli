import os from 'node:os';
import path from 'node:path';
const home = os.homedir();
export const paths =
  process.platform === 'win32'
    ? {
        config: path.join(process.env.APPDATA ?? home, 'FOUAD AI'),
        data: path.join(process.env.LOCALAPPDATA ?? home, 'FOUAD AI'),
        cache: path.join(process.env.LOCALAPPDATA ?? home, 'FOUAD AI', 'cache'),
      }
    : process.platform === 'darwin'
      ? {
          config: path.join(home, 'Library/Application Support/FOUAD AI'),
          data: path.join(home, 'Library/Application Support/FOUAD AI'),
          cache: path.join(home, 'Library/Caches/FOUAD AI'),
        }
      : {
          config: path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, '.config'), 'fouad-ai'),
          data: path.join(process.env.XDG_DATA_HOME ?? path.join(home, '.local/share'), 'fouad-ai'),
          cache: path.join(process.env.XDG_CACHE_HOME ?? path.join(home, '.cache'), 'fouad-ai'),
        };
