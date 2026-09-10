import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { accountApi } from './api';
import { AuthContext } from './auth-context';
import type { AuthUser } from './types';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    accountApi.me()
      .then(result => { if (active) setUser(result.user); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await accountApi.login(username, password);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await accountApi.logout();
    } finally {
      setUser(null);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/home`);
    }
  }, []);

  const canAccessCourse = useCallback((lessonId: number) => {
    if (!user) return false;
    return user.allowedLessons === 'all' || user.allowedLessons.includes(lessonId);
  }, [user]);

  const value = useMemo(() => ({ user, loading, login, logout, canAccessCourse }), [user, loading, login, logout, canAccessCourse]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
