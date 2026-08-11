import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function readWindowsMachineGuid() {
  if (process.platform !== 'win32') return null;
  try {
    const { stdout } = await execFileAsync('reg.exe', [
      'query',
      'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
      '/v',
      'MachineGuid',
    ], { windowsHide: true });
    const match = stdout.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

async function getFallbackInstallId(userDataPath) {
  const filePath = path.join(userDataPath, 'install-id');
  try {
    return (await readFile(filePath, 'utf8')).trim();
  } catch {
    const installId = randomUUID();
    await writeFile(filePath, installId, { encoding: 'utf8', mode: 0o600 });
    return installId;
  }
}

export async function getDeviceId(userDataPath) {
  const source = await readWindowsMachineGuid() || await getFallbackInstallId(userDataPath);
  const digest = createHash('sha256').update(`aibook-client-v1:${source}`).digest('hex').toUpperCase();
  return `${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}`;
}
