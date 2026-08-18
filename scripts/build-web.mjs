import { cp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(projectRoot, 'public');
const outputRoot = path.join(projectRoot, 'dist');

process.env.AIBOOK_SKIP_PUBLIC_COPY = '1';
await rm(outputRoot, { recursive: true, force: true });
await build({ root: projectRoot });

console.log('正在同步图片、音频、游戏和课程视频……');
await cp(publicRoot, outputRoot, {
  recursive: true,
  force: true,
  filter: (source) => {
    const parts = source.split(path.sep);
    if (parts.includes('_original_hand_anatomy_backup')) return false;

    const relativePath = path.relative(publicRoot, source).replaceAll('\\', '/');
    if (/^assets\/knowledge\/knowledge\/31\/\d{2}\(1\)\.jpg$/i.test(relativePath)) return false;

    const videoMatch = relativePath.match(/^assets\/videos\/videos\/(\d{2})\/(.+\.mp4)$/i);
    if (videoMatch) {
      const lessonId = Number(videoMatch[1]);
      const fileName = videoMatch[2].toLowerCase();
      if (fileName === 'story.mp4') return true;
      if (fileName === 'video.mp4') return lessonId % 4 === 0;
      return false;
    }

    return true;
  },
});

await writeFile(
  path.join(outputRoot, '部署说明.txt'),
  `AI启蒙绘本 Web 发布包\n\n发布目录：/AIBook/\n\n部署方法：\n1. 在网站根目录创建 AIBook 文件夹。\n2. 将本发布包内的全部文件和文件夹上传到 AIBook 文件夹内。\n3. 发布后访问：https://你的域名/AIBook/\n\n服务器要求：\n- 支持 MP4 的 Range 分段请求。\n- MP4 返回 Content-Type: video/mp4。\n- 建议为图片、音频、视频设置浏览器缓存。\n- 请勿遗漏 assets/videos、assets/sounds 和 assets/games 目录。\n`,
  'utf8',
);

async function summarize(directory) {
  let files = 0;
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await summarize(fullPath);
      files += nested.files;
      bytes += nested.bytes;
    } else {
      files += 1;
      bytes += (await stat(fullPath)).size;
    }
  }
  return { files, bytes };
}

const summary = await summarize(outputRoot);
console.log(`Web 发布包完成：${summary.files} 个文件，${(summary.bytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
