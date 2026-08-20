import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Loader2, MessageSquareText, Radio, Search } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchJobComments, fetchJobDanmaku } from '@/api/analysis';
import type { AnalysisJobView, Comment, Danmaku } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCompactNumber, formatMilliseconds, formatSeconds } from '@/lib/utils';

export function RawDataPanel({ job }: { job: AnalysisJobView }) {
  const [range, setRange] = useState<{ start: number; end: number }>();
  const raw = job.raw;
  if (!raw || !job.meta) return <RawSkeleton />;

  const peaks = raw.timeline.slice().sort((a, b) => b.count - a.count).slice(0, 4);
  const chartData = raw.timeline.map((item) => ({ ...item, label: formatSeconds(item.time) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Radio} label="已抓取弹幕" value={formatCompactNumber(job.coverage.danmakuFetched)} detail={`历史累计 ${formatCompactNumber(job.coverage.danmakuTotal)}`} />
        <Metric icon={MessageSquareText} label="评论样本" value={formatCompactNumber(job.coverage.commentsFetched)} detail={`总评论约 ${formatCompactNumber(job.coverage.commentsTotal)}`} />
        <Metric icon={BarChart3} label="AI 语义样本" value={formatCompactNumber(job.coverage.semanticComments + job.coverage.semanticDanmaku)} detail="按热度、时段和质量分层" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">弹幕密度时间轴</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs><linearGradient id="density" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.65} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={28} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(value) => [`${value} 条`, '弹幕']} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#density)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-2">
              {peaks.map((peak) => (
                <Button key={peak.time} variant="outline" size="sm" onClick={() => setRange({ start: peak.time * 1000, end: (peak.time + Math.max(5, Math.round(job.meta!.duration / 60))) * 1000 })}>
                  <Clock3 data-icon="inline-start" />{formatSeconds(peak.time)} · {peak.count}条
                </Button>
              ))}
              {range ? <Button variant="ghost" size="sm" onClick={() => setRange(undefined)}>清除定位</Button> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">评论用户等级分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={raw.commentLevels} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="level" tickFormatter={(level) => `LV${level}`} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip labelFormatter={(level) => `LV${level}`} formatter={(value) => [`${value} 条`, '评论']} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <RawBrowser jobId={job.id} range={range} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Radio; label: string; value: string; detail: string }) {
  return (
    <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><span><span className="block text-xl font-semibold">{value}</span><span className="text-xs text-muted-foreground">{label} · {detail}</span></span></CardContent></Card>
  );
}

function RawBrowser({ jobId, range }: { jobId: string; range?: { start: number; end: number } }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">原始观众反馈</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="danmaku">
          <TabsList><TabsTrigger value="danmaku">弹幕</TabsTrigger><TabsTrigger value="comments">评论</TabsTrigger></TabsList>
          <TabsContent value="danmaku"><DanmakuBrowser jobId={jobId} range={range} /></TabsContent>
          <TabsContent value="comments"><CommentBrowser jobId={jobId} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DanmakuBrowser({ jobId, range }: { jobId: string; range?: { start: number; end: number } }) {
  const [items, setItems] = useState<Danmaku[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const options = useMemo(() => ({ query, start: range?.start, end: range?.end }), [query, range?.end, range?.start]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchJobDanmaku(jobId, { ...options, offset: 0, limit: 50 }).then((page) => {
      if (!active) return;
      setItems(page.items); setTotal(page.total); setOffset(page.items.length);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [jobId, options]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const page = await fetchJobDanmaku(jobId, { ...options, offset, limit: 50 });
      setItems((current) => [...current, ...page.items]); setOffset((current) => current + page.items.length); setTotal(page.total);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchBar draft={draft} setDraft={setDraft} onSearch={() => setQuery(draft.trim())} placeholder="搜索弹幕内容" />
      {range ? <Badge variant="secondary" className="w-fit">已定位 {formatMilliseconds(range.start)}–{formatMilliseconds(range.end)}</Badge> : null}
      <div className="max-h-[460px] overflow-auto rounded-xl border">
        {items.map((item, index) => <div key={`${item.id}-${index}`} className="flex gap-3 border-b px-4 py-3 text-sm last:border-b-0"><span className="shrink-0 font-mono text-xs text-muted-foreground">{formatMilliseconds(item.progress)}</span><span className="break-all">{item.content}</span></div>)}
        {!loading && items.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">没有匹配的弹幕</p> : null}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>已显示 {items.length}/{total}</span>{items.length < total ? <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={loading}>{loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}加载更多</Button> : null}</div>
    </div>
  );
}

function CommentBrowser({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number>();
  const [loading, setLoading] = useState(false);
  const options = useMemo(() => ({ query, level }), [level, query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchJobComments(jobId, { ...options, offset: 0, limit: 30 }).then((page) => {
      if (!active) return;
      setItems(page.items); setTotal(page.total); setOffset(page.items.length);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [jobId, options]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const page = await fetchJobComments(jobId, { ...options, offset, limit: 30 });
      setItems((current) => [...current, ...page.items]); setOffset((current) => current + page.items.length); setTotal(page.total);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchBar draft={draft} setDraft={setDraft} onSearch={() => setQuery(draft.trim())} placeholder="搜索评论内容" />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={level ?? ''} onChange={(event) => setLevel(event.target.value ? Number(event.target.value) : undefined)} aria-label="按用户等级筛选"><option value="">全部等级</option>{Array.from({ length: 7 }, (_, value) => <option key={value} value={value}>LV{value}</option>)}</select>
      </div>
      <div className="max-h-[560px] overflow-auto rounded-xl border">
        {items.map((item) => <div key={item.rpid} className="flex gap-3 border-b px-4 py-4 last:border-b-0"><Avatar className="size-9"><AvatarImage src={item.avatar} referrerPolicy="no-referrer" /><AvatarFallback>{item.uname.slice(0, 1)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-medium">{item.uname}</span><Badge variant="secondary">LV{item.level}</Badge><span className="text-muted-foreground">赞 {item.like} · 回复 {item.replyCount}</span></div><p className="mt-2 break-all text-sm leading-6">{item.content}</p></div></div>)}
        {!loading && items.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">没有匹配的评论</p> : null}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>已显示 {items.length}/{total}</span>{items.length < total ? <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={loading}>{loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}加载更多</Button> : null}</div>
    </div>
  );
}

function SearchBar({ draft, setDraft, onSearch, placeholder }: { draft: string; setDraft: (value: string) => void; onSearch: () => void; placeholder: string }) {
  return <div className="flex flex-1 gap-2"><Input name="feedback-search" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onSearch()} placeholder={placeholder} /><Button variant="outline" onClick={onSearch} aria-label="搜索"><Search data-icon="inline-start" />搜索</Button></div>;
}

function RawSkeleton() {
  return <div className="flex flex-col gap-5"><div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20" />)}</div><Skeleton className="h-72" /><Skeleton className="h-96" /></div>;
}
