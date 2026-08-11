import { createDecipheriv, createPublicKey, verify } from 'node:crypto';
import { open, readFile, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const parseRange = (header, size) => {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1), partial: true };
};

async function exists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export class ContentStore {
  constructor({ contentDirectories, publicKeyPath, getContentKey }) {
    this.contentDirectories = contentDirectories;
    this.publicKeyPath = publicKeyPath;
    this.getContentKey = getContentKey;
    this.loaded = false;
    this.root = null;
    this.manifest = null;
    this.entries = new Map();
  }

  async load() {
    if (this.loaded) return this.manifest !== null;
    this.loaded = true;
    for (const directory of this.contentDirectories) {
      const manifestPath = path.join(directory, 'manifest.json');
      if (!await exists(manifestPath)) continue;
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      const { signature, ...signedPayload } = manifest;
      const publicKeyPem = await readFile(this.publicKeyPath, 'utf8');
      const valid = verify(
        null,
        Buffer.from(JSON.stringify(signedPayload)),
        createPublicKey(publicKeyPem),
        Buffer.from(signature || '', 'base64'),
      );
      if (!valid) throw new Error('课程资源清单签名无效。');
      this.root = directory;
      this.manifest = manifest;
      this.entries = new Map(manifest.files.map((entry) => [entry.logicalPath.replaceAll('\\', '/'), entry]));
      return true;
    }
    return false;
  }

  async isReady() {
    try {
      return await this.load();
    } catch {
      return false;
    }
  }

  async decryptChunk(handle, entry, chunk, chunkIndex, key) {
    const encrypted = Buffer.allocUnsafe(chunk.cipherLength);
    await handle.read(encrypted, 0, encrypted.length, chunk.offset);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(chunk.iv, 'base64'));
    decipher.setAAD(Buffer.from(`${entry.logicalPath}:${chunkIndex}:${chunk.plainLength}`));
    decipher.setAuthTag(Buffer.from(chunk.tag, 'base64'));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async createResponse(logicalPath, request) {
    if (!await this.load()) return null;
    const entry = this.entries.get(logicalPath.replace(/^\/+/, ''));
    if (!entry) return null;
    const key = await this.getContentKey();
    if (!key || key.length !== 32) return new Response('License required', { status: 401 });
    const range = parseRange(request.headers.get('range'), entry.plainSize);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${entry.plainSize}` },
      });
    }

    const blobPath = path.join(this.root, 'data', entry.blob);
    const self = this;
    async function* chunks() {
      const handle = await open(blobPath, 'r');
      try {
        for (let index = 0; index < entry.chunks.length; index += 1) {
          const chunk = entry.chunks[index];
          const plainStart = chunk.plainOffset;
          const plainEnd = plainStart + chunk.plainLength - 1;
          if (plainEnd < range.start || plainStart > range.end) continue;
          const decrypted = await self.decryptChunk(handle, entry, chunk, index, key);
          const sliceStart = Math.max(0, range.start - plainStart);
          const sliceEnd = Math.min(decrypted.length, range.end - plainStart + 1);
          yield decrypted.subarray(sliceStart, sliceEnd);
        }
      } finally {
        await handle.close();
      }
    }

    const length = range.end - range.start + 1;
    const headers = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      'Content-Length': String(length),
      'Content-Type': entry.mime || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'X-AIBook-Protected': 'aes-256-gcm',
    };
    if (range.partial) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${entry.plainSize}`;
    if (request.method === 'HEAD') return new Response(null, { status: range.partial ? 206 : 200, headers });
    return new Response(Readable.toWeb(Readable.from(chunks())), {
      status: range.partial ? 206 : 200,
      headers,
    });
  }
}
