// 学习数据持久化 Schema

export interface WrongAnswer {
  questionIndex: number;
  question: string;
  selectedKey: string;
  correctKey: string;
  lessonId?: number;
  timestamp?: string;
}

export interface EarnedBadge {
  id: string;
  type: 'gold' | 'silver' | 'bronze' | 'special';
  name: string;
  description: string;
  earnedAt: string;
  lessonId?: number;
}

export interface LessonRecord {
  lessonId: number;
  completed: boolean;
  videoProgress: Record<string, number>; // videoKey -> 秒数
  quizCompleted: boolean;
  quizCorrect: number;
  quizTotal: number;
  quizAccuracy: number;
  quizTimeSeconds: number;
  wrongAnswers: WrongAnswer[];
  gameCompleted: boolean;
  lastStudyTime: string;
  totalStudySeconds: number;
  completedModules: number[];
  currentModule: number;
}

export interface LearningStorage {
  version: number;
  createdAt: string;
  lastActiveAt: string;
  lessons: Record<number, LessonRecord>;
  badges: EarnedBadge[];
  totalStudySeconds: number;
  videoWatchSeconds: number;
  currentLessonId: number | null;
  dailyStudySeconds: Record<string, number>;
}

export const STORAGE_KEYS = {
  LEARNING: 'ai_book_learning_data',
} as const;

export const CURRENT_VERSION = 1;

const toNonNegativeInteger = (value: unknown) => {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.floor(number));
};

function normalizeLessonRecord(lessonId: number, value: Partial<LessonRecord>): LessonRecord {
  const record = { ...createEmptyRecord(lessonId), ...value };
  const quizTotal = toNonNegativeInteger(record.quizTotal);
  const quizCorrect = Math.min(quizTotal, toNonNegativeInteger(record.quizCorrect));
  const completedModules = Array.from(new Set((Array.isArray(record.completedModules) ? record.completedModules : [])
    .filter(moduleId => Number.isInteger(moduleId) && moduleId >= 2 && moduleId <= 7)))
    .sort((a, b) => a - b);

  return {
    ...record,
    lessonId,
    quizTotal,
    quizCorrect,
    quizAccuracy: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0,
    completedModules,
    completed: [2, 3, 4, 5, 6, 7].every(moduleId => completedModules.includes(moduleId)),
    currentModule: Math.min(7, Math.max(2, toNonNegativeInteger(record.currentModule) || 2)),
    totalStudySeconds: toNonNegativeInteger(record.totalStudySeconds),
  };
}

export function createEmptyRecord(lessonId: number): LessonRecord {
  return {
    lessonId,
    completed: false,
    videoProgress: {},
    quizCompleted: false,
    quizCorrect: 0,
    quizTotal: 0,
    quizAccuracy: 0,
    quizTimeSeconds: 0,
    wrongAnswers: [],
    gameCompleted: false,
    lastStudyTime: new Date().toISOString(),
    totalStudySeconds: 0,
    completedModules: [],
    currentModule: 2,
  };
}

export function createEmptyStorage(): LearningStorage {
  const now = new Date().toISOString();
  return {
    version: CURRENT_VERSION,
    createdAt: now,
    lastActiveAt: now,
    lessons: {},
    badges: [],
    totalStudySeconds: 0,
    videoWatchSeconds: 0,
    currentLessonId: null,
    dailyStudySeconds: {},
  };
}

export function migrateStorage(input: Partial<LearningStorage>): LearningStorage {
  const empty = createEmptyStorage();
  const lessons = Object.fromEntries(
    Object.entries(input.lessons || {}).flatMap(([id, value]) => {
      const lessonId = Number(id);
      if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 32) return [];
      return [[lessonId, normalizeLessonRecord(lessonId, (value || {}) as Partial<LessonRecord>)]];
    }),
  );

  return {
    ...empty,
    ...input,
    version: CURRENT_VERSION,
    lessons,
    badges: input.badges || [],
    currentLessonId: input.currentLessonId ?? null,
    dailyStudySeconds: input.dailyStudySeconds || {},
  };
}
