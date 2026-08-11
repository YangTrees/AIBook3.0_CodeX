import { createCipheriv, createHash, createPrivateKey, randomBytes, sign } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const sourceRoot = path.resolve(projectRoot, option('--source', 'public/assets'));
const outputRoot = path.resolve(projectRoot, option('--output', 'release/distribution/AIBook-Content'));
const contentVersion = option('--version', '1.0.0');
const maxFiles = Number(option('--max-files', '0')) || Infinity;
const dataRoot = path.join(outputRoot, 'data');
const chunkSize = 4 * 1024 * 1024;

const mimeTypes = new Map(Object.entries({
  '.avif': 'image/avif', '.css': 'text/css; charset=utf-8', '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.ogg': 'audio/ogg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.webm': 'video/webm',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
}));

async function collectFiles(directory) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
  }));
  return nested.flat();
}

try {
  await stat(path.join(outputRoot, 'manifest.json'));
  throw new Error(`输出目录已经包含资源清单：${outputRoot}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const keyHex = (await readFile(path.join(projectRoot, '.content-key.local'), 'utf8')).trim();
const key = Buffer.from(keyHex, 'hex');
if (key.length !== 32) throw new Error('内容密钥必须是32字节。请先运行 npm run content:keygen。');
const privateKeyPem = await readFile(path.join(projectRoot, '.content-signing-private-key.local'), 'utf8');
const privateKey = createPrivateKey(privateKeyPem);

await mkdir(dataRoot, { recursive: true });
const sourceFiles = (await collectFiles(sourceRoot)).sort().slice(0, maxFiles);
const files = [];
let completedBytes = 0;

for (let fileIndex = 0; fileIndex < sourceFiles.length; fileIndex += 1) {
  const sourcePath = sourceFiles[fileIndex];
  const relativePath = path.relative(sourceRoot, sourcePath).replaceAll('\\', '/');
  const logicalPath = `assets/${relativePath}`;
  const fileId = randomBytes(16).toString('hex');
  const blob = `${fileId}.aib`;
  const blobPath = path.join(dataRoot, blob);
  const sourceInfo = await stat(sourcePath);
  const handle = await open(blobPath, 'wx');
  const chunks = [];
  const plainHash = createHash('sha256');
  let cipherOffset = 0;
  let plainOffset = 0;
  let chunkIndex = 0;
  try {
    for await (const plain of createReadStream(sourcePath, { highWaterMark: chunkSize })) {
      plainHash.update(plain);
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(`${logicalPath}:${chunkIndex}:${plain.length}`));
      const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
      const tag = cipher.getAuthTag();
      await handle.write(encrypted, 0, encrypted.length, cipherOffset);
      chunks.push({
        offset: cipherOffset,
        cipherLength: encrypted.length,
        plainOffset,
        plainLength: plain.length,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      });
      cipherOffset += encrypted.length;
      plainOffset += plain.length;
      completedBytes += plain.length;
      chunkIndex += 1;
    }
  } finally {
    await handle.close();
  }
  files.push({
    logicalPath,
    blob,
    mime: mimeTypes.get(path.extname(sourcePath).toLowerCase()) || 'application/octet-stream',
    plainSize: sourceInfo.size,
    sha256: plainHash.digest('hex'),
    chunks,
  });
  console.log(`[${fileIndex + 1}/${sourceFiles.length}] ${logicalPath}`);
}

const payload = {
  format: 'aibook-content-v1',
  contentVersion,
  createdAt: new Date().toISOString(),
  keyId: createHash('sha256').update(key).digest('hex').slice(0, 16),
  sourceBytes: completedBytes,
  files,
};
const signature = sign(null, Buffer.from(JSON.stringify(payload)), privateKey).toString('base64');
await writeFile(path.join(outputRoot, 'manifest.json'), JSON.stringify({ ...payload, signature }, null, 2), 'utf8');
console.log(`加密完成：${files.length}个文件，${(completedBytes / 1024 / 1024 / 1024).toFixed(2)}GB。`);
