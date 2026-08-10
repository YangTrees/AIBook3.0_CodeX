import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page render failed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 680, margin: '80px auto', padding: 32, borderRadius: 22, background: '#fff', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#334155', marginBottom: 10 }}>页面暂时无法显示</h2>
          <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: 18 }}>请返回首页后重试。如果问题持续出现，可以刷新页面恢复。</p>
          <button onClick={() => { window.location.hash = '/home'; window.location.reload(); }} className="kid-btn kid-btn-primary">返回首页</button>
          {import.meta.env.DEV && <pre style={{ marginTop: 20, padding: 12, borderRadius: 10, background: '#f8fafc', color: '#b91c1c', textAlign: 'left', whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.error.message}</pre>}
        </div>
      );
    }
    return this.props.children;
  }
}
