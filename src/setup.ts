import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { detectHardware } from './hardware.js';
import { recommendModel, formatBytes } from './models.js';
import { download, exists } from './downloader.js';
import { paths } from './paths.js';
import { loadConfig, saveConfig } from './config.js';
export async function setup(force = false) {
  const hw = await detectHardware();
  const model = recommendModel(hw);
  const destination = path.join(paths.data, 'models', model.filename);
  if ((await exists(destination)) && !force)
    return { hardware: hw, model, path: destination, installed: true };
  output.write(
    `\nFOUAD AI hardware\nOS: ${hw.os}/${hw.arch}\nCPU: ${hw.cpu}\nRAM: ${formatBytes(hw.ramBytes)}\nDisk free: ${formatBytes(hw.freeDiskBytes)}\nGPU: ${hw.gpu ?? 'not detected'}\n\nRecommended: ${model.name}\nProfile: ${model.profile}\nSource: ${model.source}\nLicense: ${model.license}\nDownload: ${formatBytes(model.size)}\nRAM needed: ${formatBytes(model.ram)}\nStorage: ${destination}\n`,
  );
  if (model.id === 'custom-lite-required') {
    output.write(
      '\nLow RAM detected. No alternate model will be silently downloaded. Import a verified GGUF with `fouad models import`.\n',
    );
    return { hardware: hw, model, path: destination, installed: false };
  }
  const rl = createInterface({ input, output });
  const answer = await rl.question('\nDownload the complete model now? [y/N] ');
  rl.close();
  if (!/^y(?:es)?$/i.test(answer.trim()))
    return { hardware: hw, model, path: destination, installed: false };
  if (hw.freeDiskBytes < model.size * 1.2) throw new Error('Insufficient disk space');
  const url = `${model.source}/resolve/main/${model.filename}?download=true`;
  let last = 0;
  await download(
    url,
    destination,
    model.sha256,
    (p) => {
      const now = Date.now();
      if (now - last > 500) {
        last = now;
        output.write(
          `\r${formatBytes(p.downloaded)}${p.total ? `/${formatBytes(p.total)}` : ''} ${formatBytes(p.speed)}/s${p.resumed ? ' resumed' : ''}   `,
        );
      }
    },
    undefined,
  );
  output.write('\nVerified download complete.\n');
  const config = await loadConfig();
  await saveConfig({ ...config, provider: 'llama-local', model: model.id, modelPath: destination });
  return { hardware: hw, model, path: destination, installed: true };
}
