import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import COURSE_DATA from '../data/courseData.ts';
import KnowledgeViewer from './modules/KnowledgeViewer';
import QuizModule from './modules/QuizModule';
import GameModule from './modules/GameModule';
import SummaryModule from './modules/SummaryModule';
import { useStorage } from '../hooks/useStorage';
import { getExplanationAudioForPages } from '../data/audioMapping';
import { BookOpen, BookImage, Brain, Gamepad2, Wrench, Trophy } from 'lucide-react';

interface CoursePageProps {
  courseId: number;
  onBack: () => void;
}

interface QuizRecord {
  total: number;
  correct: number;
  errors: number;
  timeSeconds: number;
  completed: boolean;
}

const MODULES = [
  { id: 2, title: '核心知识', Icon: BookOpen, subtitle: '知识讲解', color: '#6244c8', bg: '#f5f0ff' },
  { id: 3, title: '绘本视频', Icon: BookImage, subtitle: '绘本动画', color: '#c244a0', bg: '#fdf0fb' },
  { id: 4, title: '知识问答', Icon: Brain, subtitle: '随堂检测', color: '#d05c10', bg: '#fff6ed' },
  { id: 5, title: '互动游戏', Icon: Gamepad2, subtitle: '趣味实践', color: '#27a872', bg: '#edfaf4' },
  { id: 6, title: '动手时间', Icon: Wrench, subtitle: '实操指导', color: '#d07010', bg: '#fffbeb' },
  { id: 7, title: '课程总结', Icon: Trophy, subtitle: '成果汇总', color: '#c89010', bg: '#fffaeb' },
];

/* 每个模块内容区域样式 */
const CONTENT_STYLE: React.CSSProperties = {
  padding: '28px 44px 40px',
  maxWidth: 1320,
  margin: '0 auto',
};

function getPicturebookStoryDescription(title: string, keyPoints: string[]) {
  const [mainIdea, storyClue, learningGoal] = keyPoints;
  if (!mainIdea || !storyClue) {
    return `在『${title}』中，团团和点点会通过一场小冒险，发现本课AI知识在生活里的用处。`;
  }

  return `在『${title}』中，团团和点点先遇到一个和“${mainIdea}”有关的小难题，再顺着“${storyClue}”这条线索一起寻找办法，最后理解${learningGoal || mainIdea}在生活中的作用。`;
}

export default function CoursePage({ courseId, onBack }: CoursePageProps) {
  const course = COURSE_DATA.find((c) => c.id === courseId);
  const { storage, saveQuizResult, markGameCompleted, markLessonCompleted, setCurrentPosition, markModuleCompleted, updateVideoProgress, addStudyTime } = useStorage();
  const savedRecord = storage.lessons[courseId];
  const [activeModule, setActiveModule] = useState(() => {
    const savedModule = savedRecord?.currentModule || 2;
    return MODULES.some(module => module.id === savedModule) ? savedModule : 2;
  });
  const [completedModules, setCompletedModules] = useState<Set<number>>(() => new Set((savedRecord?.completedModules || []).filter(id => id >= 2 && id <= 7)));
  const [videoError, setVideoError] = useState(false);
  const [quizRecord, setQuizRecord] = useState<QuizRecord>({
    total: 10, correct: 0, errors: 0, timeSeconds: 0, completed: false,
  });
  const lastSavedVideoSecond = useRef(0);
  const videoCompletionSaved = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (MODULES.some(module => module.id === activeModule)) {
      setCurrentPosition(courseId, activeModule);
    }
  }, [activeModule, courseId, setCurrentPosition]);

  useEffect(() => {
    const timer = window.setInterval(() => addStudyTime(courseId, 30), 30000);
    return () => window.clearInterval(timer);
  }, [addStudyTime, courseId]);

  const completeModule = (moduleId: number) => {
    setCompletedModules(prev => new Set([...prev, moduleId]));
    markModuleCompleted(courseId, moduleId);
  };

  const goToModule = (moduleId: number) => {
    setVideoError(false);
    setActiveModule(moduleId);
  };

  const completeAndContinue = () => {
    completeModule(activeModule);
    if (activeModule < 7) {
      setVideoError(false);
      setActiveModule(activeModule + 1);
    }
  };

  if (!course) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--kid-gray-400)', fontSize: 20 }}>课程不存在</p>
      </div>
    );
  }

  const numStr = String(course.lessonNum).padStart(2, '0');
  const activeMod = MODULES.find(module => module.id === activeModule) || MODULES[0];
  const activeModulePosition = MODULES.findIndex(module => module.id === activeModule) + 1;

  /* 视频占位卡 */
  const VideoPlaceholder = ({
    icon, title, desc, accentColor, accentBg,
  }: { icon: ReactNode; title: string; desc: string; accentColor: string; accentBg: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        background: accentBg,
        border: `1.5px solid ${accentColor}22`,
        borderRadius: 20,
        padding: '20px 24px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: accentColor, marginBottom: 8 }}>{icon}</div>
        <h3 style={{ fontWeight: 800, fontSize: 20, color: 'var(--kid-gray-700)', marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 15, color: 'var(--kid-gray-400)' }}>{desc}</p>
      </div>
      <div style={{
        borderRadius: 20,
        overflow: 'hidden',
        border: '1.5px solid var(--kid-gray-200)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        aspectRatio: '16/9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: accentBg,
        gap: 14,
      } as React.CSSProperties}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: `${accentColor}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ display: 'flex', color: accentColor }}>{icon}</span>
        </div>
        <p style={{ color: accentColor, fontSize: 17, fontWeight: 700 }}>即将上线</p>
        <p style={{ color: 'var(--kid-gray-400)', fontSize: 14, maxWidth: 320, textAlign: 'center' }}>
          {desc}
        </p>
      </div>
    </div>
  );

  const renderModule = () => {
    switch (activeModule) {
      case 2:
        return (
          <KnowledgeViewer
            images={course.knowledgeImages}
            knowledgePoints={course.keyPoints}
            courseId={courseId}
            explanationAudio={getExplanationAudioForPages(courseId, course.knowledgeImages.length)}
            onComplete={() => completeModule(2)}
          />
        );

      case 3: {
        const rawVideoPath = `assets/videos/videos/${numStr}/story.mp4`;
        const videoPath = rawVideoPath.startsWith('.') ? rawVideoPath : `./${rawVideoPath}`;
        const storyDescription = getPicturebookStoryDescription(course.title, course.keyPoints);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              background: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1.5px solid var(--kid-gray-200)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              position: 'relative',
            }}>
              {videoError ? (
                <div style={{
                  aspectRatio: '16/9',
                  background: 'linear-gradient(135deg, #fdf0fb, #f9e0f6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}>
                  <BookImage size={48} strokeWidth={1.5} style={{ opacity: 0.6 }} />
                  <p style={{ color: '#c244a0', fontSize: 16, fontWeight: 700 }}>绘本视频暂未就绪</p>
                  <p style={{ color: '#999', fontSize: 13 }}>{videoPath}</p>
                </div>
              ) : (
                <>
                <video
                  key={courseId}
                  controls
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  disablePictureInPicture
                  disableRemotePlayback
                  playsInline
                  style={{ width: '100%', aspectRatio: '16/9', background: '#000', display: 'block' }}
                  preload="metadata"
                  onContextMenu={(event) => event.preventDefault()}
                  onDragStart={(event) => event.preventDefault()}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                      event.preventDefault();
                    }
                  }}
                  onError={() => setVideoError(true)}
                  onLoadedMetadata={(event) => {
                    const savedSeconds = savedRecord?.videoProgress[videoPath] || 0;
                    if (savedSeconds > 0 && savedSeconds < event.currentTarget.duration - 2) {
                      event.currentTarget.currentTime = savedSeconds;
                      lastSavedVideoSecond.current = savedSeconds;
                    }
                  }}
                  onTimeUpdate={(event) => {
                    const video = event.currentTarget;
                    const seconds = Math.floor(video.currentTime);
                    if (seconds - lastSavedVideoSecond.current >= 5) {
                      lastSavedVideoSecond.current = seconds;
                      updateVideoProgress(courseId, videoPath, seconds);
                    }
                    if (!videoCompletionSaved.current && video.duration > 0 && video.currentTime / video.duration >= 0.8) {
                      videoCompletionSaved.current = true;
                      completeModule(3);
                    }
                  }}
                >
                  <source src={videoPath} type="video/mp4" />
                </video>
                </>
              )}
            </div>
            <div style={{
              background: '#fdf0fb',
              borderRadius: 18,
              padding: '16px 20px',
              border: '1.5px solid #c244a015',
            }}>
              <h4 style={{ fontWeight: 800, fontSize: 17, color: '#c244a0', marginBottom: 6 }}>绘本故事</h4>
              <p style={{ fontSize: 15, color: 'var(--kid-gray-500)', lineHeight: 1.75 }}>
                {storyDescription}
              </p>
            </div>
          </div>
        );
      }

      case 4:
        return (
          <QuizModule
            quiz={course.quiz}
            courseTitle={course.title}
            courseId={courseId}
            onComplete={(record) => {
              setQuizRecord(record);
              // 保存到localStorage
              saveQuizResult(
                courseId,
                record.correct,
                record.total,
                record.timeSeconds,
                record.wrongAnswers || []
              );
              // 如果答题完成，标记课程为已完成
              if (record.completed) {
                completeModule(4);
              }
            }}
          />
        );

      case 5:
        return <GameModule courseId={courseId} numStr={numStr} onComplete={() => { markGameCompleted(courseId); completeModule(5); }} />;

      case 6:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <VideoPlaceholder icon={<Wrench size={44} strokeWidth={1.6} />} title="动手时间" desc="乐高拼插实操指导视频，上传后自动加载" accentColor="#d07010" accentBg="#fffbeb" />
            <div style={{
              background: '#fffbeb',
              borderRadius: 18,
              padding: '18px 22px',
              border: '1.5px solid #f5c84215',
            }}>
              <h4 style={{ fontWeight: 800, fontSize: 17, color: '#b07800', marginBottom: 10 }}>动手实践</h4>
              <p style={{ fontSize: 15, color: 'var(--kid-gray-500)', lineHeight: 1.75, marginBottom: 12 }}>
                跟着视频指引，用乐高积木动手拼出本节课的知识模型，在实操中加深理解！
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['准备好乐高积木', '跟随视频逐步拼装', '完成后拍照打卡'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#f5c842', color: '#7a5200',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13, flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ color: 'var(--kid-gray-600)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 7:
        return <SummaryModule course={course} quizRecord={quizRecord} />;

      default:
        return null;
    }
  };

  return (
    <div className="responsive-page course-page" style={{ width: 1920, minHeight: 1000 }}>

      {/* ===== 顶部导航栏 ===== */}
      <div className="course-topbar" style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1.5px solid var(--kid-blue-100)',
        boxShadow: '0 4px 20px rgba(33,133,208,0.08)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Header 行 */}
        <div className="course-title-row" style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 40px 10px',
        }}>
          {/* 返回按钮 */}
          <button
            onClick={onBack}
            className="kid-btn kid-btn-secondary kid-btn-sm"
            style={{ gap: 6, minWidth: 100 }}
          >
            <span>←</span>
            <span>返回首页</span>
          </button>

          {/* 课程标题 */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                background: 'var(--kid-blue-100)',
                color: 'var(--kid-blue-500)',
                fontSize: 14, fontWeight: 800,
                padding: '3px 14px', borderRadius: 999,
              }}>
                第{String(courseId).padStart(2, '0')}课
              </span>
              <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--kid-gray-900)' }}>
                {course.title}
              </span>
            </div>
          </div>

          {/* 封面缩略图 */}
          <img
            src={course.coverImage}
            alt={course.title}
            style={{
              width: 40, height: 52, borderRadius: 10,
              objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        </div>

        {/* 模块标签行 */}
        <div className="course-module-tabs" style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 10,
          padding: '0 40px 14px',
          scrollbarWidth: 'none',
        }}>
          {MODULES.map((mod) => {
            const isActive = activeModule === mod.id;
            const isCompleted = completedModules.has(mod.id) && mod.id !== activeModule;
            return (
              <button
                key={mod.id}
                onClick={() => goToModule(mod.id)}
                className={`kid-module-tab ${isActive ? 'active' : 'inactive'} ${isCompleted ? 'completed' : ''}`}
                style={isActive ? {
                  background: `linear-gradient(135deg, ${mod.color}dd, ${mod.color})`,
                } : {}}
              >
                <mod.Icon size={20} strokeWidth={2} />
                <span style={{ fontSize: 14 }}>{mod.title}</span>
                {isCompleted && (
                  <span style={{
                    fontSize: 10, color: 'var(--kid-green-400)', fontWeight: 900,
                    lineHeight: 1, marginTop: 2,
                  }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== 内容区 ===== */}
      <div className="course-content" style={CONTENT_STYLE}>

        {/* 模块标题栏 */}
        <div className="kid-float-in course-section-heading" style={{
          display: 'flex', alignItems: 'center', gap: 20,
          marginBottom: 28,
          background: activeMod.bg,
          borderRadius: 18,
          padding: '18px 24px',
          border: `1.5px solid ${activeMod.color}20`,
        }}>
          <activeMod.Icon size={40} strokeWidth={1.5} style={{ color: activeMod.color }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontWeight: 900, fontSize: 26, color: activeMod.color, marginBottom: 2 }}>
              {activeModule === 3 ? `绘本视频 · ${course.title}` : activeMod.title}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--kid-gray-400)' }}>
              {activeModule === 2
                ? `本节课我们将要学习：${course.keyPoints[0] || '本课的AI核心知识'}`
                : activeModule === 3
                  ? '本课绘本动画'
                  : activeMod.subtitle}
            </p>
          </div>
          <div style={{
            background: `${activeMod.color}18`,
            color: activeMod.color,
            fontSize: 14, fontWeight: 700,
            padding: '6px 16px', borderRadius: 12,
          }}>
            {activeModulePosition} / {MODULES.length}
          </div>
        </div>

        {/* 模块内容 */}
        <div className="kid-float-in course-module-content">
          {renderModule()}
        </div>

        {/* 导航按钮 */}
        <div className="course-actions" style={{
          display: 'flex', gap: 16, marginTop: 40,
        }}>
          {activeModule > 2 && (
            <button
              onClick={() => { setVideoError(false); setActiveModule(activeModule - 1); }}
              className="kid-btn kid-btn-secondary"
              style={{ flex: 1, gap: 8 }}
            >
              ← 上一模块
            </button>
          )}
          {activeModule < 7 && (
            <button
              onClick={completeAndContinue}
              disabled={(activeModule === 4 || activeModule === 5) && !completedModules.has(activeModule)}
              className="kid-btn kid-btn-primary"
              style={{ flex: 1, gap: 8, opacity: ((activeModule === 4 || activeModule === 5) && !completedModules.has(activeModule)) ? 0.5 : 1 }}
            >
              {(activeModule === 4 || activeModule === 5) && !completedModules.has(activeModule) ? '请先完成本环节' : completedModules.has(activeModule) ? '下一模块 →' : '完成本环节，继续 →'}
            </button>
          )}
          {activeModule === 7 && (
            <button
              onClick={() => { completeModule(7); markLessonCompleted(courseId); onBack(); }}
              className="kid-btn kid-btn-green"
              style={{ flex: 1, gap: 8 }}
            >
              完成学习，返回首页
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
