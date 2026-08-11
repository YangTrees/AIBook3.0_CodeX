import { createPrivateKey, createPublicKey, randomBytes, sign, verify } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { safeStorage } from 'electron';
import { getDeviceId } from './device-id.mjs';

const encode = (value) => Buffer.from(value).toString('base64url');
const decodeJson = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

function verifyToken(token, publicKeyPem) {
  const [payloadPart, signaturePart] = String(token || '').split('.');
  if (!payloadPart || !signaturePart || !publicKeyPem) throw new Error('授权凭证格式无效。');
  const valid = verify(
    null,
    Buffer.from(payloadPart),
    createPublicKey(publicKeyPem),
    Buffer.from(signaturePart, 'base64url'),
  );
  if (!valid) throw new Error('授权凭证签名无效。');
  return decodeJson(payloadPart);
}

function signDevelopmentToken(payload, privateKeyPem) {
  const payloadPart = encode(JSON.stringify(payload));
  const signature = sign(null, Buffer.from(payloadPart), createPrivateKey(privateKeyPem));
  return `${payloadPart}.${signature.toString('base64url')}`;
}

export class LicenseStore {
  constructor({ userDataPath, appPath, development }) {
    this.userDataPath = userDataPath;
    this.appPath = appPath;
    this.development = development;
    this.storePath = path.join(userDataPath, 'license.dat');
    this.configPath = path.join(appPath, 'electron', 'config', 'client-config.json');
    this.publicKeyPath = path.join(appPath, 'electron', 'config', 'license-signing-public-key.pem');
    this.deviceIdPromise = getDeviceId(userDataPath);
    this.cachedContentKey = null;
  }

  async readConfig() {
    try {
      return JSON.parse(await readFile(this.configPath, 'utf8'));
    } catch {
      return { licenseApiUrl: '', requestTimeoutMs: 15000 };
    }
  }

  async readPublicKey() {
    try {
      return await readFile(this.publicKeyPath, 'utf8');
    } catch {
      throw new Error('客户端缺少授权公钥，请重新安装。');
    }
  }

  async readProtectedData() {
    try {
      const encoded = await readFile(this.storePath, 'utf8');
      if (!safeStorage.isEncryptionAvailable()) throw new Error('系统安全存储当前不可用。');
      const plain = safeStorage.decryptString(Buffer.from(encoded, 'base64'));
      return JSON.parse(plain);
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      return null;
    }
  }

  async writeProtectedData(value) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows安全存储不可用，无法保存授权。');
    const encrypted = safeStorage.encryptString(JSON.stringify(value));
    await writeFile(this.storePath, encrypted.toString('base64'), { encoding: 'utf8', mode: 0o600 });
  }

  async validateStoredLicense(stored) {
    const deviceId = await this.deviceIdPromise;
    if (!stored?.licenseToken || !stored?.contentKeyBase64) {
      return { activated: false, deviceId };
    }
    try {
      const payload = verifyToken(stored.licenseToken, await this.readPublicKey());
      if (payload.deviceId !== deviceId) throw new Error('该授权不属于当前设备。');
      const now = Date.now();
      if (payload.status && payload.status !== 'active') throw new Error('该授权已停用。');
      if (payload.expiresAt && Date.parse(payload.expiresAt) < now) throw new Error('该授权已过期。');
      if (payload.offlineUntil && Date.parse(payload.offlineUntil) < now) throw new Error('离线授权已到期，请联网重新验证。');
      return {
        activated: true,
        deviceId,
        customerName: payload.customerName,
        licenseType: payload.licenseType || 'permanent',
        expiresAt: payload.expiresAt || null,
        offlineUntil: payload.offlineUntil || null,
      };
    } catch (error) {
      return { activated: false, deviceId, reason: error instanceof Error ? error.message : '授权无效。' };
    }
  }

  async getStatus() {
    return this.validateStoredLicense(await this.readProtectedData());
  }

  async getContentKey() {
    if (this.cachedContentKey) return this.cachedContentKey;
    const stored = await this.readProtectedData();
    const status = await this.validateStoredLicense(stored);
    if (!status.activated) return null;
    this.cachedContentKey = Buffer.from(stored.contentKeyBase64, 'base64');
    return this.cachedContentKey;
  }

  async createDevelopmentLicense() {
    const deviceId = await this.deviceIdPromise;
    const privateKeyPath = path.join(this.appPath, '.license-signing-private-key.local');
    const contentKeyPath = path.join(this.appPath, '.content-key.local');
    const privateKeyPem = await readFile(privateKeyPath, 'utf8');
    let contentKey;
    try {
      contentKey = Buffer.from((await readFile(contentKeyPath, 'utf8')).trim(), 'hex');
    } catch {
      contentKey = randomBytes(32);
    }
    const payload = {
      version: 1,
      status: 'active',
      deviceId,
      customerName: '客户端开发测试用户',
      licenseType: 'permanent',
      expiresAt: null,
      offlineUntil: null,
      issuedAt: new Date().toISOString(),
    };
    return {
      licenseToken: signDevelopmentToken(payload, privateKeyPem),
      contentKeyBase64: contentKey.toString('base64'),
    };
  }

  async activate(activationCode) {
    const code = String(activationCode || '').trim().toUpperCase();
    if (code.length < 8 || code.length > 64) throw new Error('请输入有效的激活码。');

    let responseData;
    if (this.development && code === 'AIBOOK-DEMO-2026') {
      responseData = await this.createDevelopmentLicense();
    } else {
      const config = await this.readConfig();
      if (!config.licenseApiUrl) throw new Error('激活服务器尚未配置，请联系课程服务人员。');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs || 15000);
      try {
        const response = await fetch(`${String(config.licenseApiUrl).replace(/\/$/, '')}/v1/licenses/activate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ activationCode: code, deviceId: await this.deviceIdPromise }),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || '激活码验证失败。');
        responseData = body;
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error('连接激活服务器超时，请检查网络。');
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    const payload = verifyToken(responseData.licenseToken, await this.readPublicKey());
    if (payload.deviceId !== await this.deviceIdPromise) throw new Error('服务器返回的授权设备不匹配。');
    const key = Buffer.from(responseData.contentKeyBase64 || '', 'base64');
    if (key.length !== 32) throw new Error('服务器返回的内容密钥无效。');
    await this.writeProtectedData({
      licenseToken: responseData.licenseToken,
      contentKeyBase64: key.toString('base64'),
      savedAt: new Date().toISOString(),
    });
    this.cachedContentKey = key;
    return this.getStatus();
  }
}
