import { useRef, useState } from 'react';
import COURSE_DATA from '../data/courseData.ts';
import { useStorage } from '../hooks/useStorage';
import { BarChart3, BookOpen, Target, Lightbulb, Star, RefreshCw, Gamepad2, Download, Upload, ShieldCheck, Users } from 'lucide-react';

type SubTabType = 'data' | 'outline' | 'weak' | 'advice';

export default function ParentPage() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('data');
  const [backupMessage, setBackupMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const { storage, getStats, importBackup } = useStorage();
  const stats = getStats();
  const completionPercent = Math.min(100, Math.round((stats.completedCount / stats.totalLessons) * 100));
  const weeklyMaxSeconds = Math.max(60, ...stats.last7Days.map(day => day.seconds));

  const subTabs = [
    { key: 'data' as SubTabType, label: '学习数据', Icon: BarChart3 },
    { key: 'outline' as SubTabType, label: '课程大纲', Icon: BookOpen },
    { key: 'weak' as SubTabType, label: '薄弱分析', Icon: Target },
    { key: 'advice' as SubTabType, label: '学习建议', Icon: Lightbulb },
  ];

  // 计算薄弱知识点
  const getWeakModules = () => {
    const moduleAccuracy: Record<string, { correct: number; total: number }> = {};

    Object.values(storage.lessons).forEach(record => {
      if (record.quizCompleted) {
        const course = COURSE_DATA.find(c => c.id === record.lessonId);
        if (course) {
          const moduleName = course.module;
          if (!moduleAccuracy[moduleName]) {
            moduleAccuracy[moduleName] = { correct: 0, total: 0 };
          }
          const quizTotal = Math.max(0, record.quizTotal);
          moduleAccuracy[moduleName].correct += Math.min(quizTotal, Math.max(0, record.quizCorrect));
          moduleAccuracy[moduleName].total += quizTotal;
        }
      }
    });

    return Object.entries(moduleAccuracy)
      .map(([module, data]) => ({
        module,
        accuracy: data.total > 0 ? Math.min(100, Math.round((data.correct / data.total) * 100)) : 0,
        total: data.total,
      }))
      .filter(m => m.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy);
  };

  const weakModules = getWeakModules();

  const formatStudyTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分钟`;
  };

  const exportData = () => {
    const data = {
      导出时间: new Date().toLocaleString(),
      学习统计: stats,
      课程详情: Object.entries(storage.lessons).map(([id, record]) => ({
        课程号: parseInt(id),
        课程标题: COURSE_DATA.find(c => c.id === parseInt(id))?.title || '',
        完成状态: record.completed ? '已完成' : '未完成',
        答题正确率: record.quizAccuracy + '%',
        错题数: record.wrongAnswers.length,
        学习时间: record.lastStudyTime,
      })),
      获得勋章: storage.badges.map(b => ({
        勋章名称: b.name,
        获得时间: b.earnedAt,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI学习档案_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(storage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `AI学习存档备份_${new Date().toISOString().split('T')[0]}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupMessage('学习存档已导出，请妥善保存备份文件。');
  };

  const handleImportBackup = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBackupMessage('导入失败：备份文件不能超过 5MB。');
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      setBackupMessage(importBackup(parsed) ? '恢复成功：学习进度、错题和勋章已更新。' : '导入失败：这不是有效的学习存档。');
    } catch {
      setBackupMessage('导入失败：文件内容无法识别。');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  return (
    <div className="kid-float-in responsive-page section-page parent-page" style={{ width: 1920, minHeight: 1000, padding: '40px 48px', boxSizing: 'border-box' }}>
      {/* 顶部标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Users size={48} strokeWidth={1.7} />
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--kid-gray-800)', margin: 0 }}>家长专区</h1>
            <p style={{ fontSize: 16, color: 'var(--kid-gray-400)', margin: '4px 0 0 0' }}>了解孩子学习进度，提供针对性辅导</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <img src="./assets/characters/characters/tuantuan.png" alt="团团" style={{ width: 60, height: 75 }} />
          <img src="./assets/characters/characters/diandian.png" alt="点点" style={{ width: 55, height: 65 }} />
        </div>
      </div>

      {/* 顶部概览卡片 */}
      <div className="parent-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        marginBottom: 32,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 24,
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: '2px solid var(--kid-blue-100)',
        }}>
          <div style={{ fontSize: 14, color: 'var(--kid-gray-500)', marginBottom: 8 }}>课程完成进度</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: 'var(--kid-blue-500)' }}>
              {stats.completedCount}
            </span>
            <span style={{ fontSize: 20, color: 'var(--kid-gray-400)' }}>/ 32课</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{
              height: 8,
              background: 'var(--kid-gray-100)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${completionPercent}%`,
                background: 'var(--kid-blue-500)',
                borderRadius: 4,
              }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--kid-gray-500)', margin: '6px 0 0 0' }}>
              完成度 {completionPercent}%
            </p>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 24,
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: '2px solid var(--kid-green-100)',
        }}>
          <div style={{ fontSize: 14, color: 'var(--kid-gray-500)', marginBottom: 8 }}>平均正确率</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 48,
              fontWeight: 900,
              color: stats.avgAccuracy >= 90 ? 'var(--kid-green-500)' : stats.avgAccuracy >= 70 ? 'var(--kid-orange-500)' : 'var(--kid-red-500)',
            }}>
              {stats.avgAccuracy}
            </span>
            <span style={{ fontSize: 20, color: 'var(--kid-gray-400)' }}>%</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--kid-gray-500)', margin: '12px 0 0 0' }}>
            共答题 {stats.totalQuiz} 道，正确 {stats.totalCorrect} 道
          </p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 24,
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: '2px solid var(--kid-orange-100)',
        }}>
          <div style={{ fontSize: 14, color: 'var(--kid-gray-500)', marginBottom: 8 }}>累计学习时长</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: 'var(--kid-orange-500)' }}>
              {Math.round(stats.totalStudySeconds / 60)}
            </span>
            <span style={{ fontSize: 20, color: 'var(--kid-gray-400)' }}>分钟</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--kid-gray-500)', margin: '12px 0 0 0' }}>
            获得勋章 {stats.totalBadges} 枚
          </p>
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
              background: activeSubTab === tab.key ? 'var(--kid-orange-500)' : 'transparent',
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
        {/* 学习数据 */}
        {activeSubTab === 'data' && (
          <div className="kid-fade-in" style={{
            background: 'white',
            borderRadius: 24,
            padding: 28,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: 0 }}>
                详细学习数据
              </h3>
              <button
                onClick={exportData}
                style={{
                  background: 'var(--kid-orange-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Download size={18} /> 导出数据
              </button>
            </div>

            <div style={{ padding: '20px 22px', marginBottom: 22, borderRadius: 18, background: '#fff', border: '1.5px solid var(--kid-gray-100)', boxShadow: '0 3px 14px rgba(0,0,0,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div><h4 style={{ fontSize: 17, fontWeight: 800, color: 'var(--kid-gray-700)', marginBottom: 3 }}>近 7 天学习节奏</h4><p style={{ fontSize: 13, color: 'var(--kid-gray-400)' }}>连续学习 {stats.currentStreak} 天 · 累计学习 {stats.studyDays} 天</p></div>
                <div style={{ color: 'var(--kid-orange-500)', fontWeight: 900 }}>本周 {formatStudyTime(stats.last7DaysSeconds)}</div>
              </div>
              <div style={{ height: 120, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 14, alignItems: 'end' }}>
                {stats.last7Days.map(day => (
                  <div key={day.date} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    <div title={`${Math.round(day.seconds / 60)} 分钟`} style={{ width: '70%', minHeight: day.seconds > 0 ? 8 : 3, height: `${Math.max(3, (day.seconds / weeklyMaxSeconds) * 82)}px`, borderRadius: '8px 8px 3px 3px', background: day.seconds > 0 ? 'linear-gradient(180deg, var(--kid-orange-400), var(--kid-orange-500))' : 'var(--kid-gray-100)' }} />
                    <span style={{ fontSize: 11, color: 'var(--kid-gray-400)' }}>{day.date.slice(5).replace('-', '/')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="backup-panel" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center', padding: '18px 20px', marginBottom: 22, borderRadius: 16, background: 'linear-gradient(135deg, var(--kid-blue-50), var(--kid-green-50))', border: '1.5px solid var(--kid-blue-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ShieldCheck size={34} color="var(--kid-green-500)" />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--kid-gray-700)', marginBottom: 3 }}>学习存档备份</div>
                  <div style={{ fontSize: 13, color: 'var(--kid-gray-500)' }}>用于换设备、清理浏览器前备份，以及未来迁移 Unity 版本。</div>
                </div>
              </div>
              <button onClick={exportBackup} className="kid-btn kid-btn-secondary" style={{ padding: '9px 16px', gap: 7 }}><Download size={17} /> 导出备份</button>
              <button onClick={() => importInputRef.current?.click()} className="kid-btn kid-btn-primary" style={{ padding: '9px 16px', gap: 7 }}><Upload size={17} /> 恢复备份</button>
              <input ref={importInputRef} type="file" accept="application/json,.json" onChange={event => handleImportBackup(event.target.files?.[0])} style={{ display: 'none' }} />
              {backupMessage && <div role="status" style={{ gridColumn: '1 / -1', paddingTop: 4, color: backupMessage.startsWith('导入失败') ? 'var(--kid-red-500)' : 'var(--kid-green-600)', fontSize: 13, fontWeight: 700 }}>{backupMessage}</div>}
            </div>

            {/* 表头 */}
            <div className="parent-table-row" style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 120px 100px 100px 120px',
              gap: 16,
              padding: '12px 16px',
              background: 'var(--kid-gray-50)',
              borderRadius: 12,
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--kid-gray-500)',
            }}>
              <div>课程号</div>
              <div>课程名称</div>
              <div>完成状态</div>
              <div>正确率</div>
              <div>错题数</div>
              <div>最近学习</div>
            </div>

            {/* 数据行 */}
            {COURSE_DATA.map(course => {
              const record = storage.lessons[course.id];
              const isCompleted = record?.completed;
              const quizAccuracy = record?.quizAccuracy || 0;

              return (
                <div className="parent-table-row"
                  key={course.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 120px 100px 100px 120px',
                    gap: 16,
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--kid-gray-100)',
                    alignItems: 'center',
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--kid-gray-700)' }}>
                    第{course.id}课
                  </div>
                  <div style={{ color: 'var(--kid-gray-600)' }}>
                    {course.title}
                  </div>
                  <div>
                    <span style={{
                      background: isCompleted ? 'var(--kid-green-50)' : 'var(--kid-gray-100)',
                      color: isCompleted ? 'var(--kid-green-500)' : 'var(--kid-gray-400)',
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                    }}>
                      {isCompleted ? '已完成' : '未完成'}
                    </span>
                  </div>
                  <div style={{
                    fontWeight: 700,
                    color: quizAccuracy >= 90 ? 'var(--kid-green-500)' : quizAccuracy >= 70 ? 'var(--kid-orange-500)' : 'var(--kid-red-500)',
                  }}>
                    {record?.quizCompleted ? quizAccuracy + '%' : '-'}
                  </div>
                  <div style={{ color: 'var(--kid-red-500)', fontWeight: 700 }}>
                    {record?.wrongAnswers?.length || 0} 道
                  </div>
                  <div style={{ color: 'var(--kid-gray-400)', fontSize: 12 }}>
                    {record?.lastStudyTime ? new Date(record.lastStudyTime).toLocaleDateString() : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 课程大纲 */}
        {activeSubTab === 'outline' && (
          <div className="kid-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {['模块A｜信息从哪里来', '模块B｜编码与压缩', '模块C｜数据与统计', '模块D｜人工智能', '模块E｜综合应用'].map(moduleName => {
              const moduleCourses = COURSE_DATA.filter(c => c.module === moduleName);
              const completedInModule = moduleCourses.filter(l => storage.lessons[l.id]?.completed).length;

              return (
                <div
                  key={moduleName}
                  style={{
                    background: 'white',
                    borderRadius: 24,
                    padding: 24,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: 0 }}>
                      {moduleName}
                    </h3>
                    <span style={{
                      background: completedInModule === moduleCourses.length
                        ? 'var(--kid-green-100)'
                        : 'var(--kid-gray-100)',
                      color: completedInModule === moduleCourses.length
                        ? 'var(--kid-green-600)'
                        : 'var(--kid-gray-500)',
                      padding: '6px 14px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 700,
                    }}>
                      {completedInModule}/{moduleCourses.length} 课完成
                    </span>
                  </div>
                  <div className="parent-outline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {moduleCourses.map(course => {
                      const record = storage.lessons[course.id];
                      const isCompleted = record?.completed;

                      return (
                        <div
                          key={course.id}
                          style={{
                            background: isCompleted ? 'var(--kid-green-50)' : 'var(--kid-gray-50)',
                            border: '2px solid',
                            borderColor: isCompleted ? 'var(--kid-green-200)' : 'var(--kid-gray-100)',
                            borderRadius: 16,
                            padding: 14,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img
                              src={course.coverImage}
                              alt={course.title}
                              style={{ width: 40, height: 52, borderRadius: 8, objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontSize: 12, color: 'var(--kid-gray-400)' }}>第{course.id}课</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--kid-gray-700)' }}>
                                {course.title}
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--kid-gray-500)' }}>
                            {course.intro.replace(/第\d+课「|」/g, '')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 薄弱分析 */}
        {activeSubTab === 'weak' && (
          <div className="kid-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{
              background: 'white',
              borderRadius: 24,
              padding: 28,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '0 0 24px 0' }}>
                各模块正确率分析
              </h3>
              {['模块A｜信息从哪里来', '模块B｜编码与压缩', '模块C｜数据与统计', '模块D｜人工智能', '模块E｜综合应用'].map(moduleName => {
                const moduleCourses = COURSE_DATA.filter(c => c.module === moduleName);
                let totalCorrect = 0;
                let totalQuiz = 0;

                moduleCourses.forEach(course => {
                  const record = storage.lessons[course.id];
                  if (record?.quizCompleted) {
                    const quizTotal = Math.max(0, record.quizTotal);
                    totalCorrect += Math.min(quizTotal, Math.max(0, record.quizCorrect));
                    totalQuiz += quizTotal;
                  }
                });

                const accuracy = totalQuiz > 0 ? Math.min(100, Math.round((totalCorrect / totalQuiz) * 100)) : 0;

                return (
                  <div key={moduleName} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--kid-gray-700)' }}>
                        {moduleName}
                      </span>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: accuracy >= 90 ? 'var(--kid-green-500)' : accuracy >= 70 ? 'var(--kid-orange-500)' : 'var(--kid-red-500)',
                      }}>
                        {accuracy}%
                      </span>
                    </div>
                    <div style={{
                      height: 16,
                      background: 'var(--kid-gray-100)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${accuracy}%`,
                        background: accuracy >= 90
                          ? 'var(--kid-green-500)'
                          : accuracy >= 70
                            ? 'var(--kid-orange-500)'
                            : 'var(--kid-red-500)',
                        borderRadius: 8,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 薄弱知识点建议 */}
            {weakModules.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, var(--kid-red-50), var(--kid-orange-50))',
                borderRadius: 24,
                padding: 28,
                border: '2px solid var(--kid-red-100)',
              }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-red-500)', margin: '0 0 20px 0' }}>
                  <Target size={20} /> 需要加强的模块
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {weakModules.map(wm => (
                    <div
                      key={wm.module}
                      style={{
                        background: 'white',
                        borderRadius: 16,
                        padding: 16,
                        border: '2px solid var(--kid-red-100)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--kid-gray-700)' }}>
                          {wm.module}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--kid-red-500)' }}>
                          {wm.accuracy}%
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--kid-gray-600)', margin: 0 }}>
                        建议：可以让孩子重新学习这个模块的核心知识和绘本视频，然后多练习相关的互动游戏来巩固知识点。
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 学习建议 */}
        {activeSubTab === 'advice' && (
          <div className="kid-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 团团点点的建议 */}
            <div style={{
              background: 'white',
              borderRadius: 24,
              padding: 28,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="./assets/characters/characters/tuantuan.png" alt="团团" style={{ width: 36, height: 45 }} />
                <img src="./assets/characters/characters/diandian.png" alt="点点" style={{ width: 32, height: 40 }} />
                团团和点点的学习小贴士
              </h3>
              <div className="parent-advice-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {[
                  { Icon: Star, title: '保持学习节奏', desc: '建议每天学习1-2节课，保持稳定的学习节奏比一次性学很多更有效。' },
                  { Icon: RefreshCw, title: '温故知新', desc: '学完新课后，可以第二天再复习一遍，做做错题本里的题目。' },
                  { Icon: Gamepad2, title: '游戏是学习', desc: '互动游戏是很好的学习方式，让孩子在游戏中理解知识点。' },
                  { Icon: Target, title: '错题不可怕', desc: '做错了题目是好事，说明学到了新东西！关键是从错误中学习。' },
                ].map((tip, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--kid-blue-50)',
                      borderRadius: 16,
                      padding: 20,
                      display: 'flex',
                      gap: 16,
                    }}
                  >
                    <tip.Icon size={36} strokeWidth={1.75} style={{ color: 'var(--kid-blue-400)', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--kid-gray-700)', margin: '0 0 6px 0' }}>
                        {tip.title}
                      </h4>
                      <p style={{ fontSize: 14, color: 'var(--kid-gray-600)', margin: 0, lineHeight: 1.6 }}>
                        {tip.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 知识点延伸 */}
            <div style={{
              background: 'linear-gradient(135deg, var(--kid-purple-50), var(--kid-blue-50))',
              borderRadius: 24,
              padding: 28,
              border: '2px solid var(--kid-purple-100)',
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--kid-purple-600)', margin: '0 0 20px 0' }}>
                <BookOpen size={20} /> 知识点延伸资源
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { title: 'Scratch编程入门', desc: '学习完编码与压缩模块后，可以尝试Scratch可视化编程', link: 'https://scratch.mit.edu/' },
                  { title: '可汗学院数学', desc: '配合数据与统计模块学习', link: 'https://zh.khanacademy.org/' },
                  { title: 'Code.org', desc: '适合少儿的计算机科学入门课程', link: 'https://code.org/' },
                ].map((resource, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'white',
                      borderRadius: 16,
                      padding: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--kid-gray-700)', margin: '0 0 4px 0' }}>
                        {resource.title}
                      </h4>
                      <p style={{ fontSize: 13, color: 'var(--kid-gray-500)', margin: 0 }}>
                        {resource.desc}
                      </p>
                    </div>
                    <a
                      href={resource.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'var(--kid-purple-500)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      访问 →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
