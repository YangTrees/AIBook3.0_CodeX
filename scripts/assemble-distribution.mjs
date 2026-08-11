import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = path.join(projectRoot, 'release', 'installer-build');
const distributionRoot = path.join(projectRoot, 'release', 'distribution');
const contentManifest = path.join(distributionRoot, 'AIBook-Content', 'manifest.json');

await stat(contentManifest).catch(() => {
  throw new Error('正式课程内容包不存在，请先运行 npm run content:encrypt。');
});
await mkdir(distributionRoot, { recursive: true });

const artifacts = (await readdir(buildRoot)).filter((name) =>
  /^AIBook-Setup-.+\.exe(?:\.blockmap)?$/i.test(name),
);
if (!artifacts.some((name) => name.toLowerCase().endsWith('.exe'))) {
  throw new Error('没有找到生成的 Windows 安装程序。');
}
for (const name of artifacts) {
  await copyFile(path.join(buildRoot, name), path.join(distributionRoot, name));
  console.log(`已加入分发目录：${name}`);
}
await copyFile(
  path.join(projectRoot, 'build', '安装说明.txt'),
  path.join(distributionRoot, '安装说明.txt'),
);
console.log(`完整分发目录：${distributionRoot}`);
