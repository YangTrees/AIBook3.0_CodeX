export type AccountType = 'trial' | 'full';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  accountType: AccountType;
  role: 'student' | 'admin';
  allowedLessons: number[] | 'all';
}

export const TRIAL_LESSON_IDS = [1, 5, 10, 31] as const;
