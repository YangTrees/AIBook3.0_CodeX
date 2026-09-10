import { useState, type FormEvent } from 'react';
import { BookOpen, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Sparkles, UserRound } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onLogin(username.trim(), password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="课程介绍">
        <img className="login-hero-image" src="./assets/login/login-hero-v3.webp" alt="小朋友和点点机器人从绘本中探索人工智能世界" />
        <div className="login-visual-shade" />
        <div className="login-brand">
          <span><BookOpen size={25} /></span>
          <div><strong>AI人工智能启蒙通识课程</strong><small>原创绘本 · 互动学习</small></div>
        </div>
        <div className="login-copy">
          <span className="login-eyebrow"><Sparkles size={16} /> 和团团、点点一起探索</span>
          <h1>打开一本绘本，<br />走进奇妙的 AI 世界</h1>
          <p>用孩子熟悉的故事、动画和游戏，讲清人工智能背后的知识，让每一次好奇都有新的发现。</p>
          <div className="login-benefits">
            <span><CheckCircle2 size={18} /> 32节原创课程</span>
            <span><CheckCircle2 size={18} /> 绘本动画讲解</span>
            <span><CheckCircle2 size={18} /> 互动游戏挑战</span>
          </div>
        </div>
        <p className="login-visual-footer">为孩子准备的人工智能第一课</p>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-heading">
            <div className="login-icon"><LockKeyhole size={27} /></div>
            <span>课程学习账号</span>
          </div>
          <h2>欢迎登录</h2>
          <p className="login-subtitle">准备好了吗？新的探索正等着你</p>

          <label className="login-field">
            <span>账号</span>
            <div><UserRound size={20} /><input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" placeholder="请输入学习账号" autoFocus /></div>
          </label>
          <label className="login-field">
            <span>密码</span>
            <div><KeyRound size={20} /><input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="请输入密码" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
          </label>

          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={submitting}>{submitting ? '正在登录…' : '进入课程'}</button>

          <div className="login-trial-note">
            <div><KeyRound size={17} /><strong>试用账号说明</strong></div>
            <span>可体验第 1、5、10、31 课，正式账号开放全部课程。</span>
          </div>
          <p className="login-help">还没有账号？请联系课程服务人员开通。</p>
        </form>
      </section>
    </main>
  );
}
