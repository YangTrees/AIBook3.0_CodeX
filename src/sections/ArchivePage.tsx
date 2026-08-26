import { useState } from 'react';
import COURSE_DATA from '../data/courseData.ts';
import { COURSE_CHAPTERS } from '../data/courseChapters';
import { useStorage } from '../hooks/useStorage';
import { BarChart3, ClipboardList, FileText, Award, BookOpen, Star, PartyPopper, Medal, ExternalLink, Compass } from 'lucide-react';

type SubTabType = 'overview' | 'details' | 'wrong' | 'badges' | 'resources';

const EXTENDED_RESOURCES = [
  {
    title: 'Scratch 编程入门',
    desc: '学习完编码与压缩内容后，可以尝试使用积木式编程创作动画和小游戏。',
    link: 'https://scratch.mit.edu/',
    tag: '创意编程',
    color: '#e07010',
    bg: '#fff6ed',
  },
  {
    title: '可汗学院数学',
    desc: '通过互动练习继续探索数学、数据与统计知识。',
    link: 'https://zh.khanacademy.org/',
    tag: '数学思维',
    color: '#16825d',
    bg: '#edfaf4',
  },
  {
    title: 'Code.org',
    desc: '适合少儿体验的计算机科学和编程启蒙课程。',
    link: 'https://code.org/',
    tag: '计算机科学',
    color: '#7653cc',
    bg: '#f5f0ff',
  },
];

interface WrongReviewItem {
  lessonId: number;
  courseTitle: string;
  questionIndex: number;
  question: string;
  selectedKey: string;
  correctKey: string;
  timestamp: string | undefined;
}

interface ArchivePageProps {
  onSelectCourse: (id: number) => void;
}

export default function ArchivePage({ onSelectCourse }: ArchivePageProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('overview');
  const [reviewQueue, setReviewQueue] = useState<WrongReviewItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewAnswer, setReviewAnswer] = useState<string | null>(null);
  const [masteredCount, setMasteredCount] = useState(0);
  const { storage, getStats, markWrongAnswerMastered } = useStorage();
  const stats = getStats();

  const subTabs = [
    { key: 'overview' as SubTabType, label: '学习总览', Icon: BarChart3 },
    { key: 'details' as SubTabType, label: '学习记录', Icon: ClipboardList },
    { key: 'wrong' as SubTabType, label: '巩固练习', Icon: FileText },
    { key: 'badges' as SubTabType, label: '我的勋章', Icon: Award },
    { key: 'resources' as SubTabType, label: '拓展资源', Icon: Compass },
  ];

  // 收集所有错题
  const allWrongAnswers: WrongReviewItem[] = [];
  Object.values(storage.lessons).forEach(record => {
    if (record.wrongAnswers && record.wrongAnswers.length > 0) {
      const course = COURSE_DATA.find(c => c.id === record.lessonId);
      record.wrongAnswers.forEach(wa => {
        allWrongAnswers.push({
          lessonId: record.lessonId,
          courseTitle: course?.title || `第${record.lessonId}课`,
          questionIndex: wa.questionIndex,
          question: wa.question,
          selectedKey: wa.selectedKey,
          correctKey: wa.correctKey,
          timestamp: wa.timestamp,
        });
      });
    }
  });

  const currentReview = reviewQueue[reviewIndex];
  const currentQuizItem = currentReview
    ? COURSE_DATA.find(course => course.id === currentReview.lessonId)?.quiz[currentReview.questionIndex]
    : undefined;

  const startReview = () => {
    setReviewQueue(allWrongAnswers);
    setReviewIndex(0);
    setReviewAnswer(null);
    setMasteredCount(0);
  };

  const answerReview = (key: string) => {
    if (reviewAnswer || !currentReview) return;
    setReviewAnswer(key);
    if (key === currentReview.correctKey) {
      setMasteredCount(value => value + 1);
      markWrongAnswerMastered(currentReview.lessonId, currentReview.questionIndex);
    }
  };

  const nextReview = () => {
    setReviewAnswer(null);
    setReviewIndex(value => value + 1);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`;
  };

  const formatRecordDate = (timestamp?: string): string => {
    if (!timestamp) return '暂无记录';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '暂无记录';
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="kid-float-in responsive-page section-page archive-page" style={{ width: 1920, minHeight: 1000, padding: '40px 48px', boxSizing: 'border-box' }}>
      {/* 顶部标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <BookOpen size={48} strokeWidth={1.7} />
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--kid-gray-800)', margin: 0 }}>我的成长</h1>
            <p style={{ fontSize: 16, color: 'var(--kid-gray-400)', margin: '4px 0 0 0' }}>记录每一次学习与进步</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <img src="./assets/characters/characters/tuantuan.png" alt="团团" style={{ width: 60, height: 75 }} />
          <img src="./assets/characters/characters/diandian.png" alt="点点" style={{ width: 55, height: 65 }} />
        </div>
      </div>

      {/* 顶部统计卡片 */}
      <div className="archive-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 20,
        marginBottom: 32,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #f4fbff, #dcefff)',
          border: '1.5px solid #b9ddf6',
          borderRadius: 24,
          padding: '24px 28px',
          color: '#21445f',
          boxShadow: '0 6px 20px rgba(33,133,208,0.12)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', marginBottom: 8 }}>已完成课程</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#12649d', lineHeight: 1.1 }}>
            {stats.completedCount}
            <span style={{ fontSize: 20, color: '#4f7897', fontWeight: 700 }}> / 32</span>
          </div>
          <div style={{ fontSize: 14, color: '#3f6683', fontWeight: 600, marginTop: 10 }}>
            课程完成度 {Math.min(100, Math.round((stats.completedCount / 32) * 100))}%
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f2fcf6, #d8f6e5)',
          border: '1.5px solid #b4e5ca',
          borderRadius: 24,
          padding: '24px 28px',
          color: '#1d533b',
          boxShadow: '0 6px 20px rgba(39,168,114,0.12)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', marginBottom: 8 }}>累计学习时长</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#187349', lineHeight: 1.1 }}>
            {formatTime(stats.totalStudySeconds)}
          </div>
          <div style={{ fontSize: 14, color: '#3e7057', fontWeight: 600, marginTop: 10 }}>
            继续加油！
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #fff9ef, #ffe4ba)',
          border: '1.5px solid #f6cf92',
          borderRadius: 24,
          padding: '24px 28px',
          color: '#70400e',
          boxShadow: '0 6px 20px rgba(224,112,16,0.12)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', marginBottom: 8 }}>完成知识挑战</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#a55010', lineHeight: 1.1 }}>
            {stats.totalQuiz}
            <span style={{ fontSize: 20, color: '#8a653c', fontWeight: 700 }}> 道</span>
          </div>
          <div style={{ fontSize: 14, color: '#7a5a34', fontWeight: 600, marginTop: 10 }}>
            每次尝试都在成长
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #fffdf4, #fff0b8)',
          border: '1.5px solid #f1d778',
          borderRadius: 24,
          padding: '24px 28px',
          color: '#70520c',
          boxShadow: '0 6px 20px rgba(200,144,16,0.12)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', marginBottom: 8 }}>获得勋章</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#946100', lineHeight: 1.1 }}>
            {storage.badges.length}
            <span style={{ fontSize: 20, color: '#806b36', fontWeight: 700 }}> 枚</span>
          </div>
          <div style={{ fontSize: 14, color: '#776332', fontWeight: 600, marginTop: 10 }}>
            {stats.avgAccuracy >= 90 ? '太棒了！' : stats.avgAccuracy >= 70 ? '很不错！' : '继续努力！'}
          </div>
        </div>
      </div>

      {/* 子Tab切换 */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        background: 'white',
        borderRadius: 20,
        padding: '12px 16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}>
        {subTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            style={{
              padding: '12px 28px',
              borderRadius: 16,
              border: 'none',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeSubTab === tab.key ? 'var(--kid-blue-500)' : 'transparent',
              color: activeSubTab === tab.key ? 'white' : 'var(--kid-gray-500)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <tab.Icon size={20} strokeWidth={2} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 子Tab内容 */}
      <div style={{ minHeight: 500 }}>
        {/* 学习总览 */}
        {activeSubTab === 'overview' && (
          <div className="kid-fade-in archive-overview" style={{ display: 'flex', gap: 32 }}>
            {/* 环形进度图 */}
            <div className="archive-progress-card" style={{
              background: 'white',
              borderRadius: 24,
              padding: 28,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              flex: '0 0 340px',
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '0 0 24px 0', textAlign: 'center' }}>
                课程完成度
              </h3>
              <div style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `conic-gradient(
                  var(--kid-blue-500) ${Math.min(100, (stats.completedCount / 32) * 100) * 3.6}deg,
                  var(--kid-gray-100) 0deg
                )`,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 42, fontWeight: 900, color: 'var(--kid-blue-500)' }}>
                    {Math.min(100, Math.round((stats.completedCount / 32) * 100))}%
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--kid-gray-400)' }}>
                    {stats.completedCount}/32课
                  </div>
                </div>
              </div>
            </div>

            {/* 各模块完成情况 */}
            <div style={{
              background: 'white',
              borderRadius: 24,
              padding: 28,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              flex: 1,
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '0 0 24px 0' }}>
                四章学习情况
              </h3>
              {COURSE_CHAPTERS.map(chapter => {
                const chapterLessons = COURSE_DATA.filter(course => course.id >= chapter.startLesson && course.id <= chapter.endLesson);
                const completedInChapter = chapterLessons.filter(lesson => storage.lessons[lesson.id]?.completed).length;
                const total = chapterLessons.length;
                const percent = total > 0 ? Math.min(100, Math.round((completedInChapter / total) * 100)) : 0;

                return (
                  <div key={chapter.title} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: chapter.color }}>{chapter.title}</span>
                        <div style={{ fontSize: 12, color: 'var(--kid-gray-400)', marginTop: 3 }}>{chapter.desc}</div>
                      </div>
                      <span style={{ fontSize: 14, color: chapter.color, fontWeight: 800 }}>{completedInChapter}/{total} 课</span>
                    </div>
                    <div style={{
                      height: 12,
                      background: 'var(--kid-gray-100)',
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: percent === 100 ? 'var(--kid-green-500)' : chapter.color,
                        borderRadius: 6,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 学习记录 */}
        {activeSubTab === 'details' && (
          <div className="kid-fade-in" style={{
            background: 'white',
            borderRadius: 24,
            padding: 28,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '0 0 24px 0' }}>
              每课学习记录
            </h3>
            <div className="archive-course-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}>
              {COURSE_DATA.map(course => {
                const record = storage.lessons[course.id];
                const isCompleted = record?.completed;
                const quizAccuracy = record?.quizAccuracy || 0;
                const completedSteps = record?.completedModules?.filter(moduleId => moduleId >= 2 && moduleId <= 7).length || 0;

                return (
                  <div
                    key={course.id}
                    style={{
                      border: '2px solid',
                      borderColor: isCompleted ? 'var(--kid-green-200)' : 'var(--kid-gray-100)',
                      borderRadius: 16,
                      padding: 14,
                      background: isCompleted ? 'var(--kid-green-50)' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <img
                        src={course.coverImage}
                        alt={course.title}
                        style={{ width: 40, height: 52, borderRadius: 8, objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kid-gray-700)' }}>
                          第{course.id}课
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--kid-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                          {course.title}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13,
                    }}>
                      <span style={{
                        color: isCompleted ? 'var(--kid-green-500)' : 'var(--kid-gray-400)',
                        fontWeight: 700,
                      }}>
                        {isCompleted ? '已完成' : '未完成'}
                      </span>
                      {record?.quizAccuracy !== undefined && (
                        <span style={{
                          color: quizAccuracy >= 90 ? 'var(--kid-green-500)' : quizAccuracy >= 70 ? 'var(--kid-orange-500)' : 'var(--kid-red-500)',
                          fontWeight: 700,
                        }}>
                          {quizAccuracy}%
                        </span>
                      )}
                    </div>
                    <div style={{
                      marginTop: 10,
                      paddingTop: 9,
                      borderTop: '1px solid var(--kid-gray-100)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 11,
                      color: 'var(--kid-gray-400)',
                    }}>
                      <span>最近学习：{formatRecordDate(record?.lastStudyTime)}</span>
                      <span style={{ color: completedSteps > 0 ? 'var(--kid-blue-500)' : 'var(--kid-gray-400)', fontWeight: 700 }}>
                        学习环节 {completedSteps}/6
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 巩固练习 */}
        {activeSubTab === 'wrong' && (
          <div className="kid-fade-in" style={{
            background: 'white',
            borderRadius: 24,
            padding: 28,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: 0 }}>
                再练一练
                <span style={{ fontSize: 14, color: 'var(--kid-gray-400)', fontWeight: 400, marginLeft: 12 }}>{allWrongAnswers.length} 道知识正在等你再次挑战</span>
              </h3>
              {allWrongAnswers.length > 0 && reviewQueue.length === 0 && (
                <button onClick={startReview} className="kid-btn kid-btn-primary" style={{ padding: '10px 20px' }}>开始巩固练习 →</button>
              )}
            </div>
            {reviewQueue.length > 0 ? (
              reviewIndex < reviewQueue.length ? (
                <div style={{ maxWidth: 900, margin: '0 auto', padding: 28, borderRadius: 22, background: 'var(--kid-blue-50)', border: '2px solid var(--kid-blue-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, color: 'var(--kid-blue-500)', fontWeight: 800 }}>
                    <span>第{currentReview.lessonId}课 · {currentReview.courseTitle}</span>
                    <span>{reviewIndex + 1} / {reviewQueue.length}</span>
                  </div>
                  <h4 style={{ fontSize: 22, lineHeight: 1.6, color: 'var(--kid-gray-800)', marginBottom: 22 }}>{currentReview.question}</h4>
                  <div className="review-option-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {(currentQuizItem?.options || []).map(option => {
                      const isSelected = reviewAnswer === option.key;
                      const isCorrect = reviewAnswer !== null && option.key === currentReview.correctKey;
                      const isWrong = isSelected && option.key !== currentReview.correctKey;
                      return (
                        <button key={option.key} onClick={() => answerReview(option.key)} disabled={reviewAnswer !== null} style={{ textAlign: 'left', padding: '16px 18px', borderRadius: 14, border: `2px solid ${isCorrect ? 'var(--kid-green-400)' : isWrong ? 'var(--kid-orange-400)' : 'var(--kid-gray-100)'}`, background: isCorrect ? 'var(--kid-green-50)' : isWrong ? 'var(--kid-orange-50)' : '#fff', color: 'var(--kid-gray-700)', fontSize: 16, fontWeight: 700, cursor: reviewAnswer ? 'default' : 'pointer' }}>
                          <span style={{ marginRight: 10, color: 'var(--kid-blue-500)' }}>{option.key}.</span>{option.text}
                        </button>
                      );
                    })}
                  </div>
                  {reviewAnswer && (
                    <div style={{ marginTop: 22, padding: 18, borderRadius: 14, background: reviewAnswer === currentReview.correctKey ? 'var(--kid-green-50)' : 'var(--kid-orange-50)' }}>
                      <strong style={{ color: reviewAnswer === currentReview.correctKey ? 'var(--kid-green-600)' : 'var(--kid-orange-500)' }}>
                        {reviewAnswer === currentReview.correctKey ? '太棒了，你找到了正确答案！' : `很接近了！我们一起看看答案：${currentReview.correctKey}`}
                      </strong>
                      {currentQuizItem?.explanation && <p style={{ marginTop: 8, color: 'var(--kid-gray-500)', lineHeight: 1.6 }}>{currentQuizItem.explanation}</p>}
                      <button onClick={nextReview} className="kid-btn kid-btn-primary" style={{ marginTop: 14, padding: '9px 18px' }}>{reviewIndex === reviewQueue.length - 1 ? '查看结果 →' : '下一题 →'}</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '55px 20px' }}>
                  <Star size={64} strokeWidth={1.5} style={{ marginBottom: 14 }} />
                  <h4 style={{ fontSize: 26, fontWeight: 900, color: 'var(--kid-gray-800)', marginBottom: 10 }}>本轮练习完成</h4>
                  <p style={{ color: 'var(--kid-gray-500)', marginBottom: 22 }}>你成功巩固了 {masteredCount} 道知识！其他内容可以随时回来继续挑战。</p>
                  <button onClick={() => setReviewQueue([])} className="kid-btn kid-btn-green">继续看看</button>
                </div>
              )
            ) : allWrongAnswers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--kid-gray-400)' }}>
                <PartyPopper size={64} strokeWidth={1.5} style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 18, fontWeight: 700 }}>太棒了，今天的知识都掌握得很稳！</p>
                <p style={{ fontSize: 14 }}>继续探索新课程，让成长足迹越来越丰富吧！</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {allWrongAnswers.map((wa, idx) => (
                  <div
                    key={`${wa.lessonId}-${wa.question.slice(0, 20)}-${idx}`}
                    style={{
                      background: 'linear-gradient(135deg, var(--kid-blue-50), #fff)',
                      border: '2px solid var(--kid-blue-100)',
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span style={{
                          background: 'var(--kid-blue-100)',
                          color: 'var(--kid-blue-500)',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                        }}>
                          第{wa.lessonId}课 · {wa.courseTitle}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--kid-gray-400)' }}>
                        {wa.timestamp ? new Date(wa.timestamp).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--kid-gray-700)',
                      margin: '0 0 10px 0',
                    }}>
                      {wa.question}
                    </p>
                    <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                      <span style={{ color: 'var(--kid-gray-500)' }}>
                        上次选择：{wa.selectedKey}
                      </span>
                      <span style={{ color: 'var(--kid-green-500)' }}>
                        知识提示：正确选项 {wa.correctKey}
                      </span>
                      <button onClick={() => onSelectCourse(wa.lessonId)} style={{ marginLeft: 'auto', border: 'none', borderRadius: 10, padding: '7px 14px', background: 'var(--kid-blue-500)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                        再学一遍 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 我的勋章 */}
        {activeSubTab === 'badges' && (
          <div className="kid-fade-in" style={{
            background: 'white',
            borderRadius: 24,
            padding: 28,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '0 0 24px 0' }}>
              我的勋章墙
              <span style={{ fontSize: 14, color: 'var(--kid-gray-400)', fontWeight: 400, marginLeft: 12 }}>
                共 {storage.badges.length} 枚勋章
              </span>
            </h3>
            {storage.badges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--kid-gray-400)' }}>
                <Medal size={64} strokeWidth={1.5} style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 18, fontWeight: 700 }}>还没有获得勋章</p>
                <p style={{ fontSize: 14 }}>完成课程答题，正确率达到70%以上即可获得！</p>
              </div>
            ) : (
              <div className="badge-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
                {storage.badges.map(badge => {
                  const badgeColor = badge.type === 'gold'
                    ? 'linear-gradient(135deg, #f5c842, #e8a810)'
                    : badge.type === 'silver'
                      ? 'linear-gradient(135deg, #9ab0c8, #6a8aaa)'
                      : 'linear-gradient(135deg, #f5a84d, #e07010)';
                  return (
                    <div
                      key={badge.id}
                      style={{
                        background: badge.type === 'gold' ? '#fffbeb' : badge.type === 'silver' ? '#f8fafc' : '#fff6ed',
                        border: '2px solid',
                        borderColor: badge.type === 'gold' ? '#f5c842' : badge.type === 'silver' ? '#9ab0c8' : '#f5a84d',
                        borderRadius: 20,
                        padding: 20,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: badgeColor,
                        margin: '0 auto 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}>
                        <Medal size={38} color="#fff" strokeWidth={1.8} />
                      </div>
                      <h4 style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: 'var(--kid-gray-700)',
                        margin: '0 0 6px 0',
                      }}>
                        {badge.name.replace(/[🥇🥈🥉]\s*/gu, '')}
                      </h4>
                      <p style={{
                        fontSize: 12,
                        color: 'var(--kid-gray-500)',
                        margin: '0 0 8px 0',
                      }}>
                        {badge.description}
                      </p>
                      <p style={{
                        fontSize: 11,
                        color: 'var(--kid-gray-400)',
                        margin: 0,
                      }}>
                        获得时间：{new Date(badge.earnedAt).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 拓展学习资源 */}
        {activeSubTab === 'resources' && (
          <div className="kid-fade-in" style={{
            background: 'linear-gradient(135deg, var(--kid-purple-50), var(--kid-blue-50))',
            borderRadius: 24,
            padding: 28,
            border: '2px solid var(--kid-purple-100)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--kid-purple-600)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Compass size={24} /> 拓展学习资源
              </h3>
              <p style={{ fontSize: 14, color: 'var(--kid-gray-500)', margin: 0 }}>完成课程后，可以前往这些优质平台继续探索。</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
              {EXTENDED_RESOURCES.map(resource => (
                <div key={resource.link} style={{
                  background: 'white',
                  borderRadius: 18,
                  padding: 20,
                  border: `1.5px solid ${resource.color}22`,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 170,
                }}>
                  <span style={{ alignSelf: 'flex-start', padding: '5px 10px', borderRadius: 8, background: resource.bg, color: resource.color, fontSize: 12, fontWeight: 800 }}>
                    {resource.tag}
                  </span>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '15px 0 7px' }}>{resource.title}</h4>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--kid-gray-500)', margin: '0 0 18px', flex: 1 }}>{resource.desc}</p>
                  <a href={resource.link} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: resource.color, color: 'white', padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                    前往学习 <ExternalLink size={15} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
