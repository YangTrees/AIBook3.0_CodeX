import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerAppScheme, installAppProtocol } from './app-protocol.mjs';
import { LicenseStore } from './license-store.mjs';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(currentDirectory, '..');
const development = !app.isPackaged && process.argv.includes('--dev');

registerAppScheme();
app.setName('AI启蒙绘本客户端');

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let mainWindow = null;
let licenseStore = null;
let contentStore = null;

const getContentDirectories = () => {
  const directories = [];
  if (process.env.AIBOOK_CONTENT_DIR) directories.push(path.resolve(process.env.AIBOOK_CONTENT_DIR));
  directories.push(path.join(process.resourcesPath, 'content'));
  directories.push(path.join(path.dirname(app.getPath('exe')), 'content'));
  if (development) directories.push(path.join(appPath, 'release', 'distribution', 'AIBook-Content'));
  return Array.from(new Set(directories));
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#eaf5ff',
    autoHideMenuBar: true,
    title: 'AI启蒙绘本客户端',
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: development,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL('aibook://app/index.html').catch((error) => {
    console.error('[client] 页面加载失败', error);
  });
  if (development) {
    mainWindow.webContents.on('did-finish-load', () => console.log('[client] 激活页面加载完成'));
    mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
      console.error('[client] 页面资源加载失败', { code, description, url });
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('[client] 页面进程退出', details);
    });
  }
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('aibook://app/')) event.preventDefault();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function installIpcHandlers() {
  ipcMain.handle('license:get-status', () => licenseStore.getStatus());
  ipcMain.handle('license:activate', (_event, code) => licenseStore.activate(code));
  ipcMain.handle('client:get-info', async () => ({
    version: app.getVersion(),
    development,
    contentReady: await contentStore.isReady(),
    contentVersion: contentStore.manifest?.contentVersion,
  }));
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
  ipcMain.handle('window:close', () => mainWindow?.close());
}

app.whenReady().then(async () => {
  licenseStore = new LicenseStore({ userDataPath: app.getPath('userData'), appPath, development });
  contentStore = await installAppProtocol({
    appPath,
    contentDirectories: getContentDirectories(),
    development,
    getContentKey: () => licenseStore.getContentKey(),
  });
  installIpcHandlers();
  createWindow();
});

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
