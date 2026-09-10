import { createContext } from 'react';
import type { AuthUser } from './types';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canAccessCourse: (lessonId: number) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
