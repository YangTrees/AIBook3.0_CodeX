import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentStore } from '../electron/content-store.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const contentRoot = path.resolve(projectRoot, option('--content', 'release/distribution/AIBook-Content'));
const key = Buffer.from((await readFile(path.join(projectRoot, '.content-key.local'), 'utf8')).trim(), 'hex');

const store = new ContentStore({
  contentDirectories: [contentRoot],
  publicKeyPath: path.join(projectRoot, 'electron', 'config', 'content-signing-public-key.pem'),
  getContentKey: async () => key,
});
if (!await store.load()) throw new Error(`找不到加密资源包：${contentRoot}`);

let verifiedBytes = 0;
for (const entry of store.manifest.files) {
  const response = await store.createResponse(entry.logicalPath, new Request(`https://verify.invalid/${entry.logicalPath}`));
  if (!response?.ok) throw new Error(`无法解密：${entry.logicalPath}`);
  const hash = createHash('sha256');
  let decryptedBytes = 0;
  for await (const chunk of response.body) {
    hash.update(chunk);
    decryptedBytes += chunk.byteLength;
  }
  const decryptedHash = hash.digest('hex');
  if (decryptedHash !== entry.sha256 || decryptedBytes !== entry.plainSize) {
    throw new Error(`校验失败：${entry.logicalPath}`);
  }
  verifiedBytes += decryptedBytes;
  console.log(`通过：${entry.logicalPath}`);
}
console.log(`资源包验证完成：${store.manifest.files.length}个文件，${verifiedBytes}字节。`);
