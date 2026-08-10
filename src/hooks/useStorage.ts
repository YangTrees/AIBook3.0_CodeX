import { useCallback, useState } from 'react';
import {
  type LearningStorage,
  STORAGE_KEYS,
  createEmptyRecord,
  createEmptyStorage,
  migrateStorage,
  type LessonRecord,
  type WrongAnswer,
} from '../data/storageSchema';

export function useStorage() {
  const toLocalDateKey = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
  const [storage, setStorage] = useState<LearningStorage>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LEARNING);
      if (raw) {
        return migrateStorage(JSON.parse(raw) as Partial<LearningStorage>);
      }
    } catch (e) {
      console.warn('Failed to load learning data:', e);
    }
    return createEmptyStorage();
  });

  // 保存到 localStorage
  const save = useCallback((data: LearningStorage) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEARNING, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save learning data:', e);
    }
  }, []);

  // 初始化/获取课程记录
  const getLessonRecord = useCallback((lessonId: number): LessonRecord => {
    return storage.lessons[lessonId] || createEmptyRecord(lessonId);
  }, [storage]);

  // 更新课程记录
  const updateLessonRecord = useCallback((lessonId: number, updates: Partial<LessonRecord>) => {
    setStorage(prev => {
      const updated = {
        ...prev,
        lastActiveAt: new Date().toISOString(),
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            ...(prev.lessons[lessonId] || createEmptyRecord(lessonId)),
            ...updates,
          },
        },
      };
      save(updated);
      return updated;
    });
  }, [save]);

  const setCurrentPosition = useCallback((lessonId: number, moduleId: number) => {
    setStorage(prev => {
      const record = prev.lessons[lessonId] || createEmptyRecord(lessonId);
      const updated: LearningStorage = {
        ...prev,
        currentLessonId: lessonId,
        lastActiveAt: new Date().toISOString(),
        lessons: {
          ...prev.lessons,
          [lessonId]: { ...record, currentModule: moduleId, lastStudyTime: new Date().toISOString() },
        },
      };
      save(updated);
      return updated;
    });
  }, [save]);

  const markModuleCompleted = useCallback((lessonId: number, moduleId: number) => {
    setStorage(prev => {
      const record = prev.lessons[lessonId] || createEmptyRecord(lessonId);
      const completedModules = Array.from(new Set([...record.completedModules.filter(id => id >= 2 && id <= 7), moduleId])).sort((a, b) => a - b);
      const updated: LearningStorage = {
        ...prev,
        currentLessonId: lessonId,
        lastActiveAt: new Date().toISOString(),
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            ...record,
            completedModules,
            currentModule: Math.min(7, Math.max(record.currentModule, moduleId + 1)),
            completed: [2, 3, 4, 5, 6, 7].every(id => completedModules.includes(id)),
            lastStudyTime: new Date().toISOString(),
          },
        },
      };
      save(updated);
      return updated;
    });
  }, [save]);

  // 保存答题结果
  const saveQuizResult = useCallback((
    lessonId: number,
    correct: number,
    total: number,
    timeSeconds: number,
    wrongAnswers: WrongAnswer[]
  ) => {
    const normalizedTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
    const normalizedCorrect = Math.min(normalizedTotal, Math.max(0, Math.floor(Number.isFinite(correct) ? correct : 0)));
    const accuracy = normalizedTotal > 0 ? Math.round((normalizedCorrect / normalizedTotal) * 100) : 0;
    const badgeType: 'gold' | 'silver' | 'bronze' =
      accuracy >= 90 ? 'gold' : accuracy >= 70 ? 'silver' : 'bronze';

    setStorage(prev => {
      const record = prev.lessons[lessonId] || createEmptyRecord(lessonId);
      const updated: LearningStorage = {
        ...prev,
        lastActiveAt: new Date().toISOString(),
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            ...record,
            quizCompleted: true,
            quizCorrect: normalizedCorrect,
            quizTotal: normalizedTotal,
            quizAccuracy: accuracy,
            quizTimeSeconds: timeSeconds,
            wrongAnswers: wrongAnswers,
            lastStudyTime: new Date().toISOString(),
          },
        },
      };

      // 检查是否需要添加勋章
      const existingBadge = prev.badges.find(b => b.lessonId === lessonId);
      if (!existingBadge && accuracy >= 70) {
        updated.badges = [
          ...prev.badges,
          {
            id: `lesson_${lessonId}`,
            type: badgeType,
            name: `第${lessonId}课勋章`,
            description: `完成第${lessonId}课学习，正确率${accuracy}%`,
            earnedAt: new Date().toISOString(),
            lessonId,
          },
        ];
      }

      save(updated);
      return updated;
    });
  }, [save]);

  // 标记游戏完成
  const markGameCompleted = useCallback((lessonId: number) => {
    updateLessonRecord(lessonId, { gameCompleted: true });
  }, [updateLessonRecord]);

  // 更新视频进度
  const updateVideoProgress = useCallback((lessonId: number, videoKey: string, seconds: number) => {
    setStorage(prev => {
      const record = prev.lessons[lessonId] || createEmptyRecord(lessonId);
      const previousSeconds = record.videoProgress[videoKey] || 0;
      const watchedDelta = Math.max(0, seconds - previousSeconds);
      const updated: LearningStorage = {
        ...prev,
        videoWatchSeconds: prev.videoWatchSeconds + watchedDelta,
        lastActiveAt: new Date().toISOString(),
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            ...record,
            videoProgress: {
              ...record.videoProgress,
              [videoKey]: seconds,
            },
          },
        },
      };
      save(updated);
      return updated;
    });
  }, [save]);

  // 标记课程完成
  const markLessonCompleted = useCallback((lessonId: number) => {
    updateLessonRecord(lessonId, { completed: true });
  }, [updateLessonRecord]);

  const addStudyTime = useCallback((lessonId: number, seconds: number) => {
    if (seconds <= 0) return;
    setStorage(prev => {
      const record = prev.lessons[lessonId] || createEmptyRecord(lessonId);
      const dateKey = toLocalDateKey(new Date());
      const updated: LearningStorage = {
        ...prev,
        totalStudySeconds: prev.totalStudySeconds + seconds,
        dailyStudySeconds: {
          ...prev.dailyStudySeconds,
          [dateKey]: (prev.dailyStudySeconds[dateKey] || 0) + seconds,
        },
        lastActiveAt: new Date().toISOString(),
        lessons: {
          ...prev.lessons,
          [lessonId]: { ...record, totalStudySeconds: record.totalStudySeconds + seconds, lastStudyTime: new Date().toISOString() },
        },
      };
      save(updated);
      return updated;
    });
  }, [save, toLocalDateKey]);

  // 获取统计数据
  const getStats = useCallback(() => {
    const lessons = Object.values(storage.lessons);
    const completedCount = Math.min(32, lessons.filter(l => l.completed).length);
    const quizCompletedCount = lessons.filter(l => l.quizCompleted).length;

    let totalCorrect = 0;
    let totalQuiz = 0;
    let totalErrors = 0;
    lessons.forEach(l => {
      const quizTotal = Math.max(0, l.quizTotal);
      totalCorrect += Math.min(quizTotal, Math.max(0, l.quizCorrect));
      totalQuiz += quizTotal;
      totalErrors += l.wrongAnswers.length;
    });

    const avgAccuracy = totalQuiz > 0 ? Math.min(100, Math.round((totalCorrect / totalQuiz) * 100)) : 0;
    const studyDates = Object.keys(storage.dailyStudySeconds).filter(key => storage.dailyStudySeconds[key] > 0).sort();
    let currentStreak = 0;
    const cursor = new Date();
    if (!storage.dailyStudySeconds[toLocalDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (storage.dailyStudySeconds[toLocalDateKey(cursor)] > 0) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = toLocalDateKey(date);
      return { date: key, seconds: storage.dailyStudySeconds[key] || 0 };
    });

    return {
      completedCount,
      quizCompletedCount,
      totalLessons: 32,
      totalCorrect,
      totalQuiz,
      avgAccuracy,
      totalErrors,
      totalBadges: storage.badges.length,
      totalStudySeconds: storage.totalStudySeconds,
      studyDays: studyDates.length,
      currentStreak,
      last7Days,
      last7DaysSeconds: last7Days.reduce((sum, day) => sum + day.seconds, 0),
    };
  }, [storage, toLocalDateKey]);

  // 清除所有数据
  const clearAllData = useCallback(() => {
    const empty = createEmptyStorage();
    setStorage(empty);
    save(empty);
  }, [save]);

  const markWrongAnswerMastered = useCallback((lessonId: number, questionIndex: number) => {
    setStorage(prev => {
      const record = prev.lessons[lessonId];
      if (!record) return prev;
      const updated: LearningStorage = {
        ...prev,
        lastActiveAt: new Date().toISOString(),
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            ...record,
            wrongAnswers: record.wrongAnswers.filter(item => item.questionIndex !== questionIndex),
          },
        },
      };
      save(updated);
      return updated;
    });
  }, [save]);

  const importBackup = useCallback((input: unknown): boolean => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
    const candidate = input as Partial<LearningStorage>;
    if (candidate.lessons !== undefined && (typeof candidate.lessons !== 'object' || Array.isArray(candidate.lessons))) return false;
    if (candidate.badges !== undefined && !Array.isArray(candidate.badges)) return false;
    try {
      const migrated = migrateStorage(candidate);
      setStorage(migrated);
      save(migrated);
      return true;
    } catch {
      return false;
    }
  }, [save]);

  return {
    storage,
    getLessonRecord,
    updateLessonRecord,
    saveQuizResult,
    markGameCompleted,
    updateVideoProgress,
    markLessonCompleted,
    getStats,
    clearAllData,
    setCurrentPosition,
    markModuleCompleted,
    addStudyTime,
    markWrongAnswerMastered,
    importBackup,
  };
}
