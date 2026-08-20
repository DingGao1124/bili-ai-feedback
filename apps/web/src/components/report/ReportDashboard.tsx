import { useState } from 'react';
import {
  ChevronRight,
  CircleUserRound,
  Lightbulb,
  MessageSquareQuote,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AnalysisReport,
  CoreFeedback,
  CreationSuggestion,
  SentimentBreakdown,
} from '@/types';
import { VideoCard } from '@/components/common/VideoCard';
import { EvidenceList } from '@/components/report/EvidenceList';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn, formatSeconds } from '@/lib/utils';

const PRIORITY_LABEL = { high: '高优先级', medium: '中优先级', low: '可观察' } as const;
const SENTIMENT_LABEL = { positive: '正面', neutral: '中性', negative: '负面' } as const;
const CATEGORY_LABEL = { content: '内容', structure: '结构', topic: '选题', interaction: '互动', expression: '表达' } as const;

export function ReportDashboard({ report }: { report: AnalysisReport }) {
  return (
    <div className="flex flex-col gap-5">
      <VideoCard meta={report.meta} coverage={report.coverage} />
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-5 text-primary" />本期观众反馈摘要</CardTitle></CardHeader>
        <CardContent><p className="text-base leading-8">{report.summary}</p><p className="mt-3 text-xs text-muted-foreground">语义分析覆盖 {report.coverage.semanticComments.toLocaleString()} 条评论与 {report.coverage.semanticDanmaku.toLocaleString()} 条弹幕；话题次数按已抓取完整语料复算。</p></CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="section-title">AI 话题摘要</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.topics.map((topic) => <TopicChip key={topic.label} topic={topic} />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="section-title">整体情绪倾向</CardTitle></CardHeader>
          <CardContent><SentimentBar value={report.sentiment} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="section-title">弹幕情绪 / 密度时间轴</CardTitle></CardHeader>
        <CardContent><Timeline report={report} /></CardContent>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <Card>
          <CardHeader><CardTitle className="section-title">Top 5 核心反馈与具体建议</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-0">
            {report.coreFeedbacks.map((item, index) => <FeedbackRow key={item.title} item={item} index={index} />)}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader><CardTitle className="section-title">深度观众 / 高价值反馈</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {report.highValueFeedbacks.map((item) => (
                <div key={item.id} className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2"><Avatar className="size-8"><AvatarFallback><CircleUserRound className="size-4" /></AvatarFallback></Avatar><span className="font-medium">{item.uname}</span><Badge variant="secondary">LV{item.level}</Badge><Badge variant="outline">价值 {item.score}</Badge></div>
                  <p className="mt-3 text-sm leading-6">{item.content}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{item.signals.map((signal) => <Badge key={signal} variant="outline">{signal}</Badge>)}</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="section-title">下一期创作优化建议</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {report.suggestions.map((item) => <SuggestionCard key={item.title} item={item} />)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TopicChip({ topic }: { topic: AnalysisReport['topics'][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-full">
      <CollapsibleTrigger asChild><Button variant={open ? 'secondary' : 'outline'} size="sm">{topic.label}<Badge variant="secondary">{topic.count}</Badge></Button></CollapsibleTrigger>
      <CollapsibleContent className="mt-2 w-full rounded-xl border bg-muted/30 p-4 sm:w-[420px]"><p className="mb-3 text-sm leading-6">{topic.insight}</p><EvidenceList items={topic.evidence} /></CollapsibleContent>
    </Collapsible>
  );
}

function SentimentBar({ value }: { value: SentimentBreakdown }) {
  const items = [
    { key: 'positive', label: '正面', value: value.positive, color: 'bg-emerald-500' },
    { key: 'neutral', label: '中性', value: value.neutral, color: 'bg-slate-300' },
    { key: 'negative', label: '负面', value: value.negative, color: 'bg-rose-500' },
  ];
  return <div className="flex flex-col gap-4"><div className="flex h-4 overflow-hidden rounded-full">{items.map((item) => <span key={item.key} className={item.color} style={{ width: `${Math.round(item.value * 100)}%` }} />)}</div><div className="grid grid-cols-3 gap-2">{items.map((item) => <div key={item.key}><span className="block text-lg font-semibold">{Math.round(item.value * 100)}%</span><span className="text-xs text-muted-foreground">{item.label}</span></div>)}</div></div>;
}

function Timeline({ report }: { report: AnalysisReport }) {
  const data = report.timeline.map((item) => ({ ...item, label: formatSeconds(item.time) }));
  return <ResponsiveContainer width="100%" height={260}><AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="reportDensity" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.68} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={28} /><YAxis tickLine={false} axisLine={false} fontSize={11} /><Tooltip formatter={(value) => [`${value} 条`, '弹幕密度']} /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#reportDensity)" strokeWidth={2} /></AreaChart></ResponsiveContainer>;
}

function FeedbackRow({ item, index }: { item: CoreFeedback; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="py-5 first:pt-0"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><Badge variant={item.sentiment}>{SENTIMENT_LABEL[item.sentiment]}</Badge><Badge variant="outline">{PRIORITY_LABEL[item.priority]}</Badge></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.insight}</p><div className="mt-3 rounded-lg bg-primary/[0.06] p-3 text-sm leading-6"><Target className="mr-1 inline size-4 text-primary" />{item.suggestion}</div><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="mt-2"><MessageSquareQuote data-icon="inline-start" />查看 {item.evidence.length} 条原始证据<ChevronRight className={cn('transition-transform', open && 'rotate-90')} data-icon="inline-end" /></Button></CollapsibleTrigger><CollapsibleContent className="pt-2"><EvidenceList items={item.evidence} /></CollapsibleContent></div></div></div>
      {index < 4 ? <Separator /> : null}
    </Collapsible>
  );
}

function SuggestionCard({ item }: { item: CreationSuggestion }) {
  const [open, setOpen] = useState(false);
  return <Collapsible open={open} onOpenChange={setOpen}><div className="rounded-xl border p-4"><div className="flex items-center gap-2"><Lightbulb className="size-4 text-primary" /><span className="font-medium">{item.title}</span><Badge variant="secondary" className="ml-auto">{CATEGORY_LABEL[item.category]}</Badge></div><p className="mt-3 text-sm font-medium leading-6">{item.action}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.rationale}</p><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="mt-2 px-0">查看依据<ChevronRight className={cn('transition-transform', open && 'rotate-90')} data-icon="inline-end" /></Button></CollapsibleTrigger><CollapsibleContent><EvidenceList items={item.evidence} /></CollapsibleContent></div></Collapsible>;
}
