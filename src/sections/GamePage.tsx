import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import COURSE_DATA from '../data/courseData.ts';
import { useStorage } from '../hooks/useStorage';
import { Gamepad2, RotateCcw, CircleCheck, Rocket, Shield, Sparkles, Target, Clock3, Castle, Building2, Combine } from 'lucide-react';

type GameEntry = {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  gamePath: string;
  kind: 'course' | 'featured';
  lessonId?: number;
  difficulty?: string;
};

type FeaturedProgress = Record<string, {
  completed: boolean;
  bestWave?: number;
  bestSeconds?: number;
  bestScore?: number;
}>;

const FEATURED_STORAGE_KEY = 'aibook-featured-game-progress-v1';

const FEATURED_GAMES: GameEntry[] = [
  {
    id: 'ai-tower-defense',
    title: 'AI知识保卫战',
    subtitle: '建造AI思维炮塔，守护知识核心',
    coverImage: './assets/games/games02/covers/game01-tower-defense.png',
    gamePath: './assets/games/games02/Game01_TaFang/aitafang.html',
    kind: 'featured',
    difficulty: '进阶',
  },
  {
    id: 'code-survivor',
    title: '代码世界幸存者',
    subtitle: '收集信息光包，组合AI技能持续生存',
    coverImage: './assets/games/games02/covers/game02-code-survivor.png',
    gamePath: './assets/games/games02/Game02_XinCunZhe/Game02_aixingcunzhe.html',
    kind: 'featured',
    difficulty: '挑战',
  },
  {
    id: 'matrix-defense',
    title: '向噪声开炮',
    subtitle: '操控算力炮台，击退噪声与幻觉怪潮',
    coverImage: './assets/games/games02/covers/game03-matrix-defense.png',
    gamePath: './assets/games/games02/Game03_KaiPao/Game03_aikaipao.html',
    kind: 'featured',
    difficulty: '挑战',
  },
  {
    id: 'land-survival',
    title: 'AI领地生存战',
    subtitle: '经营数据资源，布置防线守住智能核心',
    coverImage: './assets/games/games02/covers/game04-land-survival.png',
    gamePath: './assets/games/games02/Game04_LandSurvival/Game04_LingDiShengCun.html',
    kind: 'featured',
    difficulty: '进阶',
  },
  {
    id: 'town-development',
    title: '奇智小镇建设家',
    subtitle: '配置自动规则，建设会思考的未来小镇',
    coverImage: './assets/games/games02/covers/game05-town-development.png',
    gamePath: './assets/games/games02/Game05_TownDevelopment/Game05_Town.html',
    kind: 'featured',
    difficulty: '进阶',
  },
  {
    id: 'card-merge',
    title: 'AI知识梦工坊',
    subtitle: '合成知识卡牌，完成订单点亮AI图鉴',
    coverImage: './assets/games/games02/covers/game06-card-merge.png',
    gamePath: './assets/games/games02/Game06_CardMerge/Game06_Merge.html',
    kind: 'featured',
    difficulty: '轻松',
  },
];

export default function GamePage() {
  const [playingGame, setPlayingGame] = useState<GameEntry | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameFrameKey, setGameFrameKey] = useState(0);
  const [featuredProgress, setFeaturedProgress] = useState<FeaturedProgress>(() => {
    try {
      return JSON.parse(localStorage.getItem(FEATURED_STORAGE_KEY) || '{}') as FeaturedProgress;
    } catch {
      return {};
    }
  });
  const { storage, markGameCompleted } = useStorage();

  const gameList: GameEntry[] = COURSE_DATA.map(course => ({
    id: `course-${course.id}`,
    lessonId: course.id,
    title: course.title,
    subtitle: `第${course.id}课专属互动练习`,
    coverImage: course.coverImage,
    gamePath: `./assets/games/games/index${String(course.id).padStart(2, '0')}.html`,
    kind: 'course' as const,
  }));

  useEffect(() => {
    const onFeaturedProgress = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        gameId?: string;
        completed?: boolean;
        wave?: number;
        seconds?: number;
        score?: number;
      };
      if (data?.type !== 'aibook-featured-game-progress' || !data.gameId) return;
      setFeaturedProgress(previous => {
        const old = previous[data.gameId!] || { completed: false };
        const next = {
          ...previous,
          [data.gameId!]: {
            completed: old.completed || Boolean(data.completed),
            bestWave: Math.max(old.bestWave || 0, data.wave || 0),
            bestSeconds: Math.max(old.bestSeconds || 0, data.seconds || 0),
            bestScore: Math.max(old.bestScore || 0, data.score || 0),
          },
        };
        localStorage.setItem(FEATURED_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('message', onFeaturedProgress);
    return () => window.removeEventListener('message', onFeaturedProgress);
  }, []);

  const getGameProgress = (lessonId: number): number => {
    const record = storage.lessons[lessonId];
    return record?.gameCompleted ? 100 : 0;
  };

  const handlePlayGame = (game: GameEntry) => {
    setPlayingGame(game);
    setGameFrameKey(value => value + 1);
  };

  const handleCloseGame = () => {
    setPlayingGame(null);
  };

  const handleGameComplete = () => {
    if (playingGame) {
      if (playingGame.kind === 'course' && playingGame.lessonId) {
        markGameCompleted(playingGame.lessonId);
      } else {
        setFeaturedProgress(previous => {
          const next = {
            ...previous,
            [playingGame.id]: { ...(previous[playingGame.id] || {}), completed: true },
          };
          localStorage.setItem(FEATURED_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setPlayingGame(null);
      }, 2000);
    }
  };

  return (
    <div className="kid-float-in responsive-page section-page game-page" style={{ width: 1920, minHeight: 1000, padding: '40px 48px', boxSizing: 'border-box' }}>
      {/* 顶部标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Gamepad2 size={48} strokeWidth={1.7} />
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--kid-gray-800)', margin: 0 }}>趣味游戏</h1>
            <p style={{ fontSize: 16, color: 'var(--kid-gray-400)', margin: '4px 0 0 0' }}>32个课程游戏 + 6个大型挑战，自由练习巩固知识点</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <img src="./assets/characters/characters/tuantuan.png" alt="团团" style={{ width: 60, height: 75 }} />
          <img src="./assets/characters/characters/diandian.png" alt="点点" style={{ width: 55, height: 65 }} />
        </div>
      </div>

      {/* 精选大型挑战 */}
      <section style={{ marginBottom: 38 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--kid-gray-800)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={26} color="#f08a24" /> 精选大型挑战
            </h2>
            <p style={{ margin: '5px 0 0', color: 'var(--kid-gray-400)', fontSize: 14 }}>跨课程综合玩法，挑战更长流程和更丰富的AI技能组合</p>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 999, background: '#fff4dc', color: '#b96b15', fontWeight: 800, fontSize: 13 }}>6款精选游戏</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 22 }}>
          {FEATURED_GAMES.map((game, index) => {
            const progress = featuredProgress[game.id];
            const Icon = [Shield, Sparkles, Target, Castle, Building2, Combine][index];
            return (
              <article key={game.id} onClick={() => handlePlayGame(game)} className="game-card featured-game-card" style={{
                position: 'relative', overflow: 'hidden', borderRadius: 24, minHeight: 290, cursor: 'pointer',
                boxShadow: '0 12px 34px rgba(26, 80, 120, 0.16)', border: '2px solid rgba(255,255,255,.8)', background: '#0b1730',
              }}>
                <img src={game.coverImage} alt={game.title} style={{ width: '100%', height: 290, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,15,38,.05) 24%, rgba(5,15,38,.94) 100%)' }} />
                <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8 }}>
                  <span style={{ padding: '7px 11px', borderRadius: 999, background: 'rgba(255,255,255,.92)', color: '#176a92', fontWeight: 900, fontSize: 12 }}>精选挑战</span>
                  <span style={{ padding: '7px 11px', borderRadius: 999, background: 'rgba(19,35,66,.82)', color: '#ffe3a2', fontWeight: 800, fontSize: 12 }}>难度：{game.difficulty}</span>
                </div>
                <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(38,205,220,.2)', border: '1px solid rgba(112,236,245,.5)', display: 'grid', placeItems: 'center' }}><Icon size={24} /></div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 23, fontWeight: 900 }}>{game.title}</h3>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(255,255,255,.78)' }}>{game.subtitle}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#bdeff4', display: 'flex', alignItems: 'center', gap: 6 }}><Clock3 size={14} /> {progress?.bestSeconds ? `最佳 ${Math.floor(progress.bestSeconds / 60)}:${String(progress.bestSeconds % 60).padStart(2, '0')}` : '尚未挑战'}</span>
                    <span style={{ padding: '7px 13px', borderRadius: 999, background: '#2d8df5', fontWeight: 900 }}>开始挑战</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--kid-gray-800)' }}>32个课程游戏</h2>
        <p style={{ margin: '5px 0 0', color: 'var(--kid-gray-400)', fontSize: 14 }}>按课程顺序练习，每课都有专属知识小游戏</p>
      </div>

      {/* 游戏网格 */}
      <div className="media-card-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 24,
      }}>
        {gameList.map(game => {
          const progress = getGameProgress(game.lessonId!);

          return (
            <div
              key={game.lessonId}
              onClick={() => handlePlayGame(game)}
              className="game-card"
              style={{
                background: 'white',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                border: '2px solid var(--kid-gray-100)',
                position: 'relative',
              }}
            >
              {/* 封面图 */}
              <div style={{
                position: 'relative',
                aspectRatio: '3/4',
                background: `linear-gradient(135deg, var(--kid-green-100), var(--kid-blue-100))`,
              }}>
                <img
                  src={game.coverImage}
                  alt={game.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {/* 课程号角标 */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  background: 'var(--kid-green-500)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                }}>
                  第{game.lessonId}课
                </div>

                {/* 游戏图标 */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                }}>
                  <div className="game-play-btn" style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  }}>
                    <span style={{ marginLeft: 4 }}>▶</span>
                  </div>
                </div>

                {/* 已完成标记 */}
                {progress === 100 && (
                  <div className="completed-badge" style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'var(--kid-green-500)',
                    color: 'white',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}>
                    ✓
                  </div>
                )}
              </div>

              {/* 游戏信息 */}
              <div style={{ padding: '14px 16px' }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--kid-gray-700)',
                  margin: '0 0 8px 0',
                  textAlign: 'center',
                }}>
                  {game.title}
                </h3>

                {/* 进度条 */}
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    height: 6,
                    background: 'var(--kid-gray-100)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: progress === 100
                        ? 'var(--kid-green-400)'
                        : 'var(--kid-blue-400)',
                      borderRadius: 3,
                    }} />
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: progress === 100 ? 'var(--kid-green-500)' : 'var(--kid-gray-400)',
                    margin: '4px 0 0 0',
                    textAlign: 'center',
                    fontWeight: progress === 100 ? 700 : 400,
                  }}>
                    {progress === 100 ? '已通关' : '点击开始游戏'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 游戏模态框 */}
      {playingGame && createPortal(
        <div
          className="game-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: 'all 0.35s ease',
          }}
        >
          <div
            className="game-modal-content kid-bounce-in"
            style={{
              width: '95%',
              maxWidth: 1400,
              height: '90vh',
              background: 'white',
              borderRadius: 24,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            }}
          >
            {/* 游戏头部 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              background: 'var(--kid-green-500)',
              color: 'white',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={handleCloseGame}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✕ 退出游戏
                </button>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                  {playingGame.kind === 'course' ? `第${playingGame.lessonId}课游戏：` : '精选挑战：'}{playingGame.title}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    setGameFrameKey(value => value + 1);
                  }}
                  className="kid-btn game-control-btn"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={18} /> 重新开始
                </button>
                <button
                  onClick={handleGameComplete}
                  className="kid-btn game-control-btn-complete"
                  style={{
                    background: 'linear-gradient(135deg, #feca57, #f08a24)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 20px',
                    color: 'var(--kid-gray-800)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(240, 138, 36, 0.35)',
                  }}
                >
                  <CircleCheck size={18} /> 我完成了
                </button>
              </div>
            </div>

            {/* 游戏iframe */}
            <div style={{ flex: 1, background: 'var(--kid-gray-100)', position: 'relative' }}>
              <iframe
                key={gameFrameKey}
                src={playingGame.gamePath}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={playingGame.title}
              />
            </div>

            {/* 底部鼓励语 */}
            <div style={{
              padding: '8px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              background: 'var(--kid-green-50)',
              flexShrink: 0,
            }}>
              <img src="./assets/characters/characters/tuantuan.png" alt="团团" style={{ width: 30, height: 40 }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--kid-green-600)',
                  margin: 0,
                }}>
                  团团和点点的加油声 <Rocket size={18} />
                </p>
                <p style={{
                  fontSize: 12,
                  color: 'var(--kid-gray-500)',
                  margin: 0,
                }}>
                  加油！你一定能完成的！游戏里答错了也没关系，多试几次就好了！
                </p>
              </div>
              <img src="./assets/characters/characters/diandian.png" alt="点点" style={{ width: 28, height: 36 }} />
            </div>
          </div>

          {/* 彩带庆祝动画 */}
          {showConfetti && (
            <div className="confetti-container">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: ['#feca57', '#ff6b6b', '#48dbfb', '#1a8c5c', '#a55eea', '#f08a24'][i % 6],
                    animationDelay: `${(i % 10) * 0.05}s`,
                    animationDuration: `${1.5 + (i % 7) * 0.12}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
