import { useState, useLayoutEffect, useCallback, useEffect } from 'react';
import HomePage from './sections/HomePage';
import CoursePage from './sections/CoursePage';
import BottomNav from './sections/BottomNav';
import CinemaPage from './sections/CinemaPage';
import GamePage from './sections/GamePage';
import ArchivePage from './sections/ArchivePage';
import ParentPage from './sections/ParentPage';
import PromoPage from './sections/PromoPage';
import AppErrorBoundary from './components/AppErrorBoundary';
import './App.css';

export type TabType = 'promo' | 'home' | 'cinema' | 'game' | 'archive' | 'parent';

function readRoute(): { tab: TabType; courseId: number | null } {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (!route || route === 'promo') return { tab: 'promo', courseId: null };
  const courseMatch = route.match(/^course\/(\d+)$/);
  if (courseMatch) {
    const courseId = Number(courseMatch[1]);
    if (courseId >= 1 && courseId <= 32) return { tab: 'home', courseId };
  }
  const tab = route as TabType;
  return { tab: ['promo', 'home', 'cinema', 'game', 'archive', 'parent'].includes(tab) ? tab : 'promo', courseId: null };
}

function pushRoute(path: string) {
  window.location.hash = `/${path}`;
}

function useAppScale() {
  const getLayout = () => {
    if (window.innerWidth <= 900) return { scale: 1, offset: { x: 0, y: 0 } };
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    return { scale: Math.round(s * 1000) / 1000, offset: { x: Math.round(((window.innerWidth - 1920 * s) / 2) * 100) / 100, y: Math.round(((window.innerHeight - 1080 * s) / 2) * 100) / 100 } };
  };
  const initial = getLayout();
  const [scale, setScale] = useState(initial.scale);
  const [offset, setOffset] = useState(initial.offset);
  const [compact, setCompact] = useState(() => window.innerWidth <= 900);

  const calculate = useCallback(() => {
    const targetW = 1920;
    const targetH = 1080;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isCompact = vw <= 900;
    setCompact(isCompact);
    if (isCompact) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const s = Math.min(vw / targetW, vh / targetH);
    const ox = (vw - targetW * s) / 2;
    const oy = (vh - targetH * s) / 2;
    setScale(Math.round(s * 1000) / 1000);
    setOffset({ x: Math.round(ox * 100) / 100, y: Math.round(oy * 100) / 100 });
  }, []);

  useLayoutEffect(() => {
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, [calculate]);

  return { scale, offset, compact };
}

export default function App() {
  const initialRoute = readRoute();
  const [currentTab, setCurrentTab] = useState<TabType>(initialRoute.tab);
  const [currentCourseId, setCurrentCourseId] = useState<number | null>(initialRoute.courseId);
  const { scale, offset, compact } = useAppScale();

  useEffect(() => {
    const restoreRoute = () => {
      const route = readRoute();
      setCurrentTab(route.tab);
      setCurrentCourseId(route.courseId);
    };
    window.addEventListener('popstate', restoreRoute);
    window.addEventListener('hashchange', restoreRoute);
    return () => {
      window.removeEventListener('popstate', restoreRoute);
      window.removeEventListener('hashchange', restoreRoute);
    };
  }, []);

  useEffect(() => {
    const isProtectedMedia = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('img, video, audio, picture, canvas, [data-protected-media]'));

    const preventMediaMenu = (event: MouseEvent) => {
      if (isProtectedMedia(event.target)) event.preventDefault();
    };
    const preventMediaDrag = (event: DragEvent) => {
      if (isProtectedMedia(event.target)) event.preventDefault();
    };
    const preventPageSave = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventMediaMenu, { capture: true });
    document.addEventListener('dragstart', preventMediaDrag, { capture: true });
    window.addEventListener('keydown', preventPageSave, { capture: true });
    return () => {
      document.removeEventListener('contextmenu', preventMediaMenu, { capture: true });
      document.removeEventListener('dragstart', preventMediaDrag, { capture: true });
      window.removeEventListener('keydown', preventPageSave, { capture: true });
    };
  }, []);

  const handleSelectCourse = (id: number) => {
    pushRoute(`course/${id}`);
    setCurrentCourseId(id);
  };

  const handleBackToHome = () => {
    pushRoute('home');
    setCurrentCourseId(null);
    setCurrentTab('home');
  };

  const handleTabChange = (tab: TabType) => {
    pushRoute(tab);
    setCurrentCourseId(null);
    setCurrentTab(tab);
  };

  const renderContent = () => {
    if (currentCourseId !== null) {
      return <CoursePage courseId={currentCourseId} onBack={handleBackToHome} />;
    }
    switch (currentTab) {
      case 'promo':
        return null;
      case 'home':
        return <HomePage onSelectCourse={handleSelectCourse} />;
      case 'cinema':
        return <CinemaPage />;
      case 'game':
        return <GamePage />;
      case 'archive':
        return <ArchivePage onSelectCourse={handleSelectCourse} />;
      case 'parent':
        return <ParentPage />;
      default:
        return <HomePage onSelectCourse={handleSelectCourse} />;
    }
  };

  if (currentTab === 'promo' && currentCourseId === null) {
    return (
      <PromoPage
        onExplore={() => handleTabChange('home')}
        onTrial={() => handleSelectCourse(1)}
      />
    );
  }

  return (
    <div className={`fixed inset-0 overflow-hidden app-shell ${compact ? 'is-compact' : ''}`} style={{ backgroundColor: '#b8d4f0' }}>
      {/* 1920×1080 固定画布 */}
      <div
        className="absolute app-canvas"
        style={{
          top: offset.y,
          left: offset.x,
          width: compact ? '100%' : 1920,
          height: compact ? '100%' : 1080,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
          /* 少儿柔和渐变底色：天蓝→淡紫→奶白 */
          background: 'linear-gradient(160deg, #daeeff 0%, #e8e3ff 30%, #fef9f0 60%, #e8f9f2 100%)',
          boxShadow: '0 0 60px rgba(74, 158, 232, 0.25)',
        }}
      >
        {/* 装饰光晕 · 舒缓、不刺眼 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 10% 30%, rgba(74,158,232,0.08) 0%, transparent 60%), ' +
              'radial-gradient(ellipse at 90% 20%, rgba(160,127,240,0.06) 0%, transparent 55%), ' +
              'radial-gradient(ellipse at 50% 90%, rgba(77,196,148,0.05) 0%, transparent 50%)',
            zIndex: 0,
          }}
        />

        {/* 主内容区 */}
        <div
          className="relative z-10 overflow-y-auto overflow-x-hidden scrollbar-kid app-content"
          style={{ width: compact ? '100%' : 1920, height: compact ? 'calc(100% - 72px)' : 1000 }}
        >
          <AppErrorBoundary key={currentCourseId === null ? currentTab : `course-${currentCourseId}`}>
            {renderContent()}
          </AppErrorBoundary>
        </div>

        {/* 底部导航 */}
        <div
          className="absolute z-50 app-bottom-nav"
          style={{ bottom: 0, left: 0, width: compact ? '100%' : 1920, height: compact ? 72 : 80 }}
        >
          <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}
