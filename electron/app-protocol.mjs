import { net, protocol } from 'electron';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ContentStore } from './content-store.mjs';

const isFile = async (filePath) => {
  try { return (await stat(filePath)).isFile(); } catch { return false; }
};

const resolveInside = (root, relativePath) => {
  const normalizedRoot = path.resolve(root);
  const candidate = path.resolve(normalizedRoot, relativePath);
  if (candidate !== normalizedRoot && !candidate.startsWith(`${normalizedRoot}${path.sep}`)) return null;
  return candidate;
};

export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'aibook',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  }]);
}

export async function installAppProtocol({ appPath, contentDirectories, development, getContentKey }) {
  const distRoot = path.join(appPath, 'dist-desktop');
  const publicRoot = path.join(appPath, 'public');
  const contentStore = new ContentStore({
    contentDirectories,
    publicKeyPath: path.join(appPath, 'electron', 'config', 'content-signing-public-key.pem'),
    getContentKey,
  });

  await protocol.handle('aibook', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app') return new Response('Not found', { status: 404 });
      let logicalPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!logicalPath) logicalPath = 'index.html';

      const distPath = resolveInside(distRoot, logicalPath);
      if (distPath && await isFile(distPath)) {
        return net.fetch(pathToFileURL(distPath).toString(), {
          method: request.method,
          headers: request.headers,
        });
      }

      const protectedResponse = await contentStore.createResponse(logicalPath, request);
      if (protectedResponse) return protectedResponse;

      if (development) {
        const publicPath = resolveInside(publicRoot, logicalPath);
        if (publicPath && await isFile(publicPath)) {
          return net.fetch(pathToFileURL(publicPath).toString(), {
            method: request.method,
            headers: request.headers,
          });
        }
      }
      return new Response('Not found', { status: 404 });
    } catch (error) {
      return new Response(error instanceof Error ? error.message : 'Resource error', { status: 500 });
    }
  });

  return contentStore;
}
