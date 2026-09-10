import type { AuthUser } from './types';

const configuredApiBase = import.meta.env.VITE_ACCOUNT_API_BASE?.trim();
const API_BASE = (configuredApiBase || './api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(payload.message || '服务暂时不可用，请稍后重试');
  return payload as T;
}

export const accountApi = {
  me: () => request<{ user: AuthUser }>('/auth/me'),
  login: (username: string, password: string) => request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST', body: '{}' }),
};
