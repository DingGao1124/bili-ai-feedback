import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export class RenderErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Agent message rendering failed', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <Alert variant="destructive"><AlertCircle /><AlertTitle>这部分分析内容暂时无法显示</AlertTitle><AlertDescription className="flex flex-col items-start gap-2"><span>其他数据仍可继续使用。</span><Button variant="outline" size="sm" onClick={() => window.location.reload()}><RefreshCw data-icon="inline-start" />重新加载</Button></AlertDescription></Alert>;
  }
}
