import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configDirectory = path.join(projectRoot, 'electron', 'config');

async function writeNewFile(filePath, contents, mode = 0o600) {
  try {
    await readFile(filePath);
    return false;
  } catch {
    await writeFile(filePath, contents, { encoding: 'utf8', mode, flag: 'wx' });
    return true;
  }
}

async function generateSigningPair(name) {
  const privatePath = path.join(projectRoot, `.${name}-signing-private-key.local`);
  const publicPath = path.join(configDirectory, `${name}-signing-public-key.pem`);
  try {
    await readFile(privatePath);
    await readFile(publicPath);
    return false;
  } catch {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    await writeFile(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
    await writeFile(publicPath, publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644, flag: 'wx' });
    return true;
  }
}

await mkdir(configDirectory, { recursive: true });
const contentKeyCreated = await writeNewFile(
  path.join(projectRoot, '.content-key.local'),
  randomBytes(32).toString('hex'),
);
const contentPairCreated = await generateSigningPair('content');
const licensePairCreated = await generateSigningPair('license');

console.log(`内容密钥：${contentKeyCreated ? '已创建' : '已存在'}`);
console.log(`资源签名密钥：${contentPairCreated ? '已创建' : '已存在'}`);
console.log(`授权签名密钥：${licensePairCreated ? '已创建' : '已存在'}`);
console.log('私钥文件仅保存在本机且已被 Git 忽略，请另行安全备份。');
