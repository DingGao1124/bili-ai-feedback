import { useMemo } from 'react';
import { AlertCircle, Bot, Database, RefreshCw } from 'lucide-react';
import { MessageContentRenderer } from '@/components/agent/MessageContentRenderer';
import { RenderErrorBoundary } from '@/components/agent/RenderErrorBoundary';
import { useAnalysisStore } from '@/stores/analysis-store';
import { Badge } from '@/components/ui/badge';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Message, MessageContent } from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';

export function AgentProcessPanel() {
  const job = useAnalysisStore((state) => state.job);
  const events = useAnalysisStore((state) => state.events);
  const reasoning = useAnalysisStore((state) => state.reasoning);
  const assistantMessage = useAnalysisStore((state) => state.assistantMessage);
  const tools = useAnalysisStore((state) => state.tools);
  const failed = job?.status.endsWith('_failed') ?? false;
  const streaming = Boolean(job && !failed && job.status !== 'completed');
  const steps = useMemo(() => events.filter((event) => event.type === 'status' || event.type === 'progress').slice(-6), [events]);

  return (
    <Card className="flex min-h-[680px] flex-col overflow-hidden xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)]">
      <CardHeader className="shrink-0 border-b p-5">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2"><Bot className="size-5 text-primary" />观众反馈分析师</span>
          <Badge variant={job?.status === 'completed' ? 'success' : failed ? 'destructive' : 'warning'}>
            {failed ? <AlertCircle data-icon="inline-start" /> : streaming ? <Spinner data-icon="inline-start" /> : <span className="size-1.5 rounded-full bg-emerald-500" />}
            {job?.status === 'completed' ? '已完成' : failed ? '未完成' : '运行中'}
          </Badge>
        </CardTitle>
        <div className="flex flex-col gap-2 pt-2"><div className="flex justify-between text-xs text-muted-foreground"><span>{job?.stageLabel ?? '等待任务'}</span><span>{job?.progress ?? 0}%</span></div><Progress value={job?.progress ?? 0} /></div>
      </CardHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full px-5 py-6">
                {steps.length > 0 ? (
                  <MessageScrollerItem messageId="steps">
                    <div className="flex flex-col gap-2">
                      {steps.map((event) => <div key={event.seq} className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="size-3.5 shrink-0 text-primary" /><span>{String(event.data.label ?? event.data.detail ?? '正在处理')}</span></div>)}
                    </div>
                  </MessageScrollerItem>
                ) : null}

                <MessageScrollerItem messageId="human" scrollAnchor>
                  <Message align="end"><MessageContent><Bubble variant="secondary" align="end"><BubbleContent>分析这条视频的评论和弹幕，并把结论写入创作复盘报告。</BubbleContent></Bubble></MessageContent></Message>
                </MessageScrollerItem>

                <MessageScrollerItem messageId="assistant">
                  <Message><MessageContent><RenderErrorBoundary><MessageContentRenderer reasoning={reasoning} message={assistantMessage} tools={tools} streaming={streaming} /></RenderErrorBoundary></MessageContent></Message>
                </MessageScrollerItem>

                {streaming ? (
                  <MessageScrollerItem messageId="working" scrollAnchor><Message><MessageContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /><span className="shimmer">正在处理…</span></div></MessageContent></Message></MessageScrollerItem>
                ) : null}

                {failed ? (
                  <MessageScrollerItem messageId="error" scrollAnchor><Message><MessageContent><div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{job?.error}</span></div></MessageContent></Message></MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </section>

      <CardContent className="shrink-0 border-t p-4">
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><span>DeepSeek · 创作反馈分析</span><Button variant="ghost" size="icon-sm" aria-label="刷新页面" onClick={() => window.location.reload()}><RefreshCw /></Button></div>
      </CardContent>
    </Card>
  );
}
