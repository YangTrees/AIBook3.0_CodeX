import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BookOpen, CheckCircle2, KeyRound, LoaderCircle, LockKeyhole, WifiOff } from 'lucide-react';
import type { ClientAppInfo, ClientLicenseStatus } from '../types/client';
import appIcon from '../assets/aibook-app-icon.png';

type GatePhase = 'checking' | 'activation' | 'login' | 'unlocked';

const formatDate = (value?: string | null) => {
  if (!value) return '永久有效';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '授权有效' : date.toLocaleDateString('zh-CN');
};

export default function ClientGate({ children }: { children: ReactNode }) {
  const bridge = window.aibookClient;
  const [phase, setPhase] = useState<GatePhase>(bridge ? 'checking' : 'unlocked');
  const [license, setLicense] = useState<ClientLicenseStatus | null>(null);
  const [appInfo, setAppInfo] = useState<ClientAppInfo | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [studentName, setStudentName] = useState(() => localStorage.getItem('aibook_student_name') || '小小AI研究员');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bridge) return;
    let active = true;
    Promise.all([bridge.getLicenseStatus(), bridge.getAppInfo()])
      .then(([status, info]) => {
        if (!active) return;
        setLicense(status);
        setAppInfo(info);
        setPhase(status.activated ? 'login' : 'activation');
        if (status.reason) setMessage(status.reason);
      })
      .catch(() => {
        if (!active) return;
        setMessage('客户端授权服务暂时不可用，请重新启动客户端。');
        setPhase('activation');
      });
    return () => { active = false; };
  }, [bridge]);

  const activate = async (event: FormEvent) => {
    event.preventDefault();
    if (!bridge || submitting) return;
    const code = activationCode.trim().toUpperCase();
    if (code.length < 8) {
      setMessage('请输入完整的激活码。');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const status = await bridge.activate(code);
      setLicense(status);
      if (status.activated) {
        setPhase('login');
        setActivationCode('');
      } else {
        setMessage(status.reason || '激活失败，请检查激活码后重试。');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '激活失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const enterCourse = () => {
    const name = studentName.trim() || '小小AI研究员';
    localStorage.setItem('aibook_student_name', name);
    setStudentName(name);
    setPhase('unlocked');
  };

  if (phase === 'unlocked') return <>{children}</>;

  return (
    <main className="client-gate">
      <div className="client-gate-orb client-gate-orb-a" />
      <div className="client-gate-orb client-gate-orb-b" />
      <section className="client-gate-shell">
        <div className="client-gate-brand">
          <div className="client-gate-logo"><img src={appIcon} alt="AI启蒙绘本客户端" /></div>
          <div>
            <p className="client-gate-kicker">AI BOOK · 本地学习客户端</p>
            <h1>AI人工智能<br />启蒙绘本课程</h1>
          </div>
          <p className="client-gate-lead">32节系统课程、互动游戏与绘本视频，全部保存在本机，随时开启AI探索之旅。</p>
          <div className="client-gate-feature"><CheckCircle2 size={20} /> 本地课程资源，无需在线加载</div>
          <div className="client-gate-feature"><CheckCircle2 size={20} /> 学习记录安全保存在当前设备</div>
          <div className="client-gate-feature"><CheckCircle2 size={20} /> 首次激活后支持离线学习</div>
        </div>

        <div className="client-gate-panel">
          {phase === 'checking' && (
            <div className="client-gate-state">
              <LoaderCircle className="client-gate-spinner" size={42} />
              <h2>正在检查客户端</h2>
              <p>正在验证授权和课程资源，请稍候……</p>
            </div>
          )}

          {phase === 'activation' && (
            <form onSubmit={activate}>
              <div className="client-gate-icon"><KeyRound size={28} /></div>
              <h2>激活课程客户端</h2>
              <p className="client-gate-subtitle">请输入购买后获得的激活码。每个激活码默认绑定一台电脑。</p>
              <label className="client-gate-label" htmlFor="activation-code">课程激活码</label>
              <input
                id="activation-code"
                className="client-gate-input client-gate-code"
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value.toUpperCase())}
                placeholder="AIBK-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              {message && <div className="client-gate-message"><WifiOff size={17} />{message}</div>}
              <button className="client-gate-primary" type="submit" disabled={submitting}>
                {submitting ? <LoaderCircle className="client-gate-spinner" size={20} /> : <LockKeyhole size={20} />}
                {submitting ? '正在激活…' : '立即激活'}
              </button>
              <div className="client-gate-meta">
                <span>设备编号</span><strong>{license?.deviceId || '正在获取…'}</strong>
              </div>
              {appInfo?.development && <p className="client-gate-dev">开发环境测试码：AIBOOK-DEMO-2026</p>}
            </form>
          )}

          {phase === 'login' && license && (
            <div>
              <div className="client-gate-icon client-gate-icon-success"><CheckCircle2 size={30} /></div>
              <h2>欢迎回来</h2>
              <p className="client-gate-subtitle">客户端已激活，输入学习者名称后进入课程。</p>
              <label className="client-gate-label" htmlFor="student-name">学习者名称</label>
              <input
                id="student-name"
                className="client-gate-input"
                value={studentName}
                maxLength={16}
                onChange={(event) => setStudentName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') enterCourse(); }}
              />
              <button
                className="client-gate-primary"
                type="button"
                onClick={enterCourse}
                disabled={!appInfo?.development && !appInfo?.contentReady}
              >
                <BookOpen size={20} />进入课程
              </button>
              {!appInfo?.development && !appInfo?.contentReady && (
                <div className="client-gate-message">
                  <WifiOff size={17} />课程资源未安装或校验未通过，请使用完整安装包重新安装。
                </div>
              )}
              <div className="client-gate-license-card">
                <span><CheckCircle2 size={17} />授权状态正常</span>
                <span>{license.customerName || 'AI启蒙绘本用户'}</span>
                <span>有效期至：{formatDate(license.expiresAt)}</span>
              </div>
            </div>
          )}
        </div>
      </section>
      <footer className="client-gate-footer">版本 {appInfo?.version || '—'} · 课程内容受授权保护</footer>
    </main>
  );
}
