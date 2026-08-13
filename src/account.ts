import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { paths } from './paths.js';

const PLATFORM_URL =
  process.env.FOUAD_PLATFORM_URL ?? 'https://fouad-cli-platform.fouadzulof26.workers.dev';
const credentialsFile = path.join(paths.config, 'account.json');
type Credentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user?: { id?: string; email?: string };
};
const base64url = (value: Uint8Array) => Buffer.from(value).toString('base64url');
async function api(route: string, init?: RequestInit) {
  const result = await fetch(`${PLATFORM_URL}${route}`, init);
  const data = (await result.json()) as Record<string, unknown>;
  if (!result.ok)
    throw new Error(
      typeof data.error === 'string' ? data.error : `Platform returned ${result.status}`,
    );
  return data;
}
function openBrowser(url: string) {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  const child = execFile(command, args, { windowsHide: true });
  child.unref();
}
export async function login(): Promise<void> {
  const verifier = base64url(randomBytes(32));
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = base64url(randomBytes(24));
  const started = await api('/api/v1/auth/device/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      state,
      pkceChallenge: challenge,
      deviceName: process.env.HOSTNAME ?? 'Fouad CLI',
      platform: `${process.platform}-${process.arch}`,
    }),
  });
  const url = String(started.verificationUrl);
  console.log(`Open: ${url}\nCode: ${String(started.userCode)}`);
  try {
    openBrowser(url);
  } catch {
    console.log('Browser could not be opened automatically. Use the URL above.');
  }
  const expiresAt = Date.now() + Number(started.expiresIn) * 1000;
  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, Number(started.interval) * 1000));
    try {
      const completed = await api('/api/v1/auth/device/poll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deviceCode: started.deviceCode, state, pkceVerifier: verifier }),
      });
      if (completed.status === 'pending') continue;
      await mkdir(paths.config, { recursive: true });
      await writeFile(credentialsFile, `${JSON.stringify(completed, null, 2)}\n`, { mode: 0o600 });
      await chmod(credentialsFile, 0o600);
      console.log('Signed in successfully.');
      return;
    } catch (error) {
      if (error instanceof Error && error.message === 'Authorization pending') continue;
      throw error;
    }
  }
  throw new Error('Device authorization expired. Run fouad login again.');
}
export async function logout(): Promise<void> {
  let credentials: Credentials | undefined;
  try {
    credentials = JSON.parse(await readFile(credentialsFile, 'utf8')) as Credentials;
  } catch {
    credentials = undefined;
  }
  if (credentials)
    await api('/api/v1/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${credentials.accessToken}` },
    }).catch(() => undefined);
  await rm(credentialsFile, { force: true });
  console.log('Signed out and removed local credentials.');
}
export async function whoami(): Promise<void> {
  try {
    const credentials = JSON.parse(await readFile(credentialsFile, 'utf8')) as Credentials;
    console.log(credentials.user?.email ?? credentials.user?.id ?? 'Authenticated account');
  } catch {
    console.log('Not signed in. Run fouad login.');
    process.exitCode = 1;
  }
}
export async function account(): Promise<void> {
  console.log(`${PLATFORM_URL}/dashboard`);
}
export async function devices(): Promise<void> {
  const credentials = JSON.parse(await readFile(credentialsFile, 'utf8')) as Credentials;
  console.log(
    JSON.stringify(
      await api('/api/v1/devices', {
        headers: { authorization: `Bearer ${credentials.accessToken}` },
      }),
      null,
      2,
    ),
  );
}
