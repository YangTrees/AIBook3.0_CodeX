import http from 'node:http';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');
const dataDir = process.env.AIBOOK_ACCOUNT_DATA_DIR || join(root, 'data');
const dataFile = join(dataDir, 'accounts.json');
const secretFile = join(dataDir, 'session-secret.txt');
const initialAdminFile = join(dataDir, 'initial-admin.txt');
const port = Number(process.env.PORT || 4181);
const host = process.env.HOST || '127.0.0.1';
const cookieName = 'aibook_session';
const trialLessons = [1, 5, 10, 31];
const loginAttempts = new Map();

function makePassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}

function passwordMatches(password, user) {
  const saved = Buffer.from(user.passwordHash || '', 'hex');
  const entered = scryptSync(password, user.passwordSalt, 64);
  return saved.length === entered.length && timingSafeEqual(saved, entered);
}

function courseUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    accountType: user.accountType,
    allowedLessons: user.role === 'admin' || user.accountType === 'full' ? 'all' : trialLessons,
  };
}

function managedUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    accountType: user.accountType,
    status: user.status,
    note: user.note || '',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    loginCount: user.loginCount || 0,
  };
}

async function saveDb(db) {
  await mkdir(dataDir, { recursive: true });
  const temp = `${dataFile}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(db, null, 2), 'utf8');
  await rename(temp, dataFile);
}

async function ensureData() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(secretFile)) await writeFile(secretFile, randomBytes(48).toString('hex'), 'utf8');
  if (existsSync(dataFile)) return;
  const password = process.env.AIBOOK_ADMIN_PASSWORD || `Admin-${randomBytes(6).toString('base64url')}`;
  const credential = makePassword(password);
  await saveDb({ version: 1, users: [{
    id: randomUUID(),
    username: 'admin',
    displayName: '系统管理员',
    role: 'admin',
    accountType: 'full',
    status: 'active',
    passwordSalt: credential.salt,
    passwordHash: credential.hash,
    sessionVersion: 1,
    note: '',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    loginCount: 0,
  }] });
  await writeFile(initialAdminFile, `后台地址：http://${host}:${port}/admin\n账号：admin\n初始密码：${password}\n\n首次登录后请立即修改密码，并删除本文件。\n`, 'utf8');
  console.log(`首次启动管理员：admin / ${password}`);
  console.log(`凭据保存在：${initialAdminFile}`);
}

async function readDb() {
  await ensureData();
  return JSON.parse(await readFile(dataFile, 'utf8'));
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

async function makeSession(user) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, sv: user.sessionVersion, exp: Date.now() + 604800000 })).toString('base64url');
  const secret = (await readFile(secretFile, 'utf8')).trim();
  return `${payload}.${sign(payload, secret)}`;
}

async function currentUser(req) {
  const cookie = String(req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  const token = decodeURIComponent(cookie.slice(cookieName.length + 1));
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const secret = (await readFile(secretFile, 'utf8')).trim();
  const expected = sign(payload, secret);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (session.exp < Date.now()) return null;
    const db = await readDb();
    const user = db.users.find(item => item.id === session.uid);
    return user && user.status === 'active' && user.sessionVersion === session.sv ? user : null;
  } catch {
    return null;
  }
}

function send(res, status, payload, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw new Error('请求内容过大');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

function cookie(token, clear = false) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${cookieName}=${clear ? '' : encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear ? 0 : 604800}${secure}`;
}

function userName(value) { return String(value || '').trim().toLowerCase(); }
function sourceIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function isRateLimited(req) {
  const key = sourceIp(req);
  const recent = (loginAttempts.get(key) || []).filter(time => Date.now() - time < 600000);
  loginAttempts.set(key, recent);
  return recent.length >= 8;
}

async function requireAdmin(req, res) {
  const user = await currentUser(req);
  if (!user) { send(res, 401, { message: '请先登录' }); return null; }
  if (user.role !== 'admin') { send(res, 403, { message: '没有后台管理权限' }); return null; }
  return user;
}

async function authApi(req, res, path) {
  if (req.method === 'GET' && path === '/api/auth/me') {
    const user = await currentUser(req);
    return user ? send(res, 200, { user: courseUser(user) }) : send(res, 401, { message: '尚未登录' });
  }
  if (req.method === 'POST' && path === '/api/auth/logout') {
    return send(res, 200, { ok: true }, { 'set-cookie': cookie('', true) });
  }
  if (req.method !== 'POST' || path !== '/api/auth/login') return false;
  if (isRateLimited(req)) return send(res, 429, { message: '尝试次数过多，请十分钟后再试' });
  const input = await readJson(req);
  const db = await readDb();
  const user = db.users.find(item => item.username === userName(input?.username));
  if (!user || !passwordMatches(String(input?.password || ''), user)) {
    const key = sourceIp(req);
    loginAttempts.set(key, [...(loginAttempts.get(key) || []), Date.now()]);
    return send(res, 401, { message: '账号或密码不正确' });
  }
  if (user.status !== 'active') return send(res, 403, { message: '账号已停用，请联系课程服务人员' });
  user.lastLoginAt = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;
  await saveDb(db);
  loginAttempts.delete(sourceIp(req));
  return send(res, 200, { user: courseUser(user) }, { 'set-cookie': cookie(await makeSession(user)) });
}

async function adminApi(req, res, path) {
  if (!path.startsWith('/api/admin/')) return false;
  const administrator = await requireAdmin(req, res);
  if (!administrator) return true;
  const db = await readDb();

  if (req.method === 'GET' && path === '/api/admin/users') {
    send(res, 200, { users: db.users.map(managedUser).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
    return true;
  }

  if (req.method === 'POST' && path === '/api/admin/users') {
    const input = await readJson(req);
    const username = userName(input?.username);
    const password = String(input?.password || '');
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return send(res, 400, { message: '账号需为3—32位字母、数字、点、横线或下划线' });
    if (password.length < 8) return send(res, 400, { message: '密码至少需要8位' });
    if (db.users.some(item => item.username === username)) return send(res, 409, { message: '该账号已经存在' });
    const credential = makePassword(password);
    const user = {
      id: randomUUID(), username, displayName: String(input?.displayName || username).trim().slice(0, 40), role: 'student',
      accountType: input?.accountType === 'full' ? 'full' : 'trial', status: 'active', passwordSalt: credential.salt,
      passwordHash: credential.hash, sessionVersion: 1, note: String(input?.note || '').trim().slice(0, 200),
      createdAt: new Date().toISOString(), lastLoginAt: null, loginCount: 0,
    };
    db.users.push(user);
    await saveDb(db);
    send(res, 201, { user: managedUser(user) });
    return true;
  }

  const updateMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (updateMatch && req.method === 'PATCH') {
    const input = await readJson(req);
    const user = db.users.find(item => item.id === decodeURIComponent(updateMatch[1]));
    if (!user) return send(res, 404, { message: '账号不存在' });
    if (user.role === 'admin' && input?.status === 'disabled') return send(res, 400, { message: '不能停用管理员账号' });
    if (['trial', 'full'].includes(input?.accountType)) user.accountType = input.accountType;
    if (['active', 'disabled'].includes(input?.status)) user.status = input.status;
    if (typeof input?.displayName === 'string') user.displayName = input.displayName.trim().slice(0, 40) || user.username;
    if (typeof input?.note === 'string') user.note = input.note.trim().slice(0, 200);
    user.sessionVersion += 1;
    await saveDb(db);
    return send(res, 200, { user: managedUser(user) });
  }

  const resetMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
  if (resetMatch && req.method === 'POST') {
    const input = await readJson(req);
    const password = String(input?.password || '');
    if (password.length < 8) return send(res, 400, { message: '密码至少需要8位' });
    const user = db.users.find(item => item.id === decodeURIComponent(resetMatch[1]));
    if (!user) return send(res, 404, { message: '账号不存在' });
    const credential = makePassword(password);
    user.passwordSalt = credential.salt;
    user.passwordHash = credential.hash;
    user.sessionVersion += 1;
    await saveDb(db);
    const headers = user.id === administrator.id ? { 'set-cookie': cookie(await makeSession(user)) } : {};
    return send(res, 200, { ok: true }, headers);
  }
  return false;
}

async function serveAdmin(res, path) {
  const requested = path === '/admin' || path === '/admin/' ? 'admin.html' : path.replace(/^\/admin\//, '');
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const file = join(publicDir, safe);
  if (!file.startsWith(publicDir) || !existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(await readFile(file));
}

await ensureData();
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/^\/AIBook(?=\/)/, '');
    if (path === '/api/health') return send(res, 200, { ok: true, time: new Date().toISOString() });
    if (path.startsWith('/api/auth/')) { const handled = await authApi(req, res, path); if (handled !== false) return; }
    if (path.startsWith('/api/admin/')) { const handled = await adminApi(req, res, path); if (handled !== false) return; }
    if (path === '/' || path.startsWith('/admin')) return serveAdmin(res, path === '/' ? '/admin' : path);
    send(res, 404, { message: '接口不存在' });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) send(res, 500, { message: '服务器处理失败' }); else res.end();
  }
}).listen(port, host, () => console.log(`账号管理平台：http://${host}:${port}/admin`));
