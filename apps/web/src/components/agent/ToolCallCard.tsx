import { useState } from 'react';
import { ChevronRight, CircleAlert, TerminalSquare } from 'lucide-react';
import type { ToolTrace } from '@/types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const TOOL_LABELS: Record<string, string> = {
  inspect_feedback_digest: '读取反馈数据摘要',
  save_topics_and_sentiment: '写入话题与情绪',
  save_core_feedbacks: '写入核心反馈',
  save_audience_and_suggestions: '写入观众洞察与建议',
};

export function ToolCallCard({ trace }: { trace: ToolTrace }) {
  const [open, setOpen] = useState(false);
  const running = trace.status === 'running';
  const failed = trace.status === 'failed';
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-full">
      <div className="group/tool flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/40">
        {failed ? <CircleAlert className="size-3.5 shrink-0 text-destructive" /> : <TerminalSquare className="size-3.5 shrink-0 text-muted-foreground/60" />}
        <span className="truncate font-medium">{TOOL_LABELS[trace.name] ?? trace.name}</span>
        <span className={cn('ml-auto size-1.5 shrink-0 rounded-full ring-1 ring-inset', running ? 'animate-pulse bg-amber-500 ring-amber-500/20' : failed ? 'bg-destructive ring-destructive/20' : 'bg-emerald-500 ring-emerald-500/20')} title={running ? '运行中' : failed ? '调用失败' : '已完成'} />
        <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="size-7" aria-label="展开工具详情"><ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} /></Button></CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="mt-1 rounded-lg border bg-muted/20 p-3">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">{trace.output === undefined ? '调用参数' : '返回结果'}</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground">{safeStringify(trace.output ?? trace.input ?? {})}</pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return '[无法显示的结构化内容]'; }
}
