import { useState, type ReactNode } from 'react';
import type { AnalysisResult } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';

import { analyze } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SentimentBar } from '@/components/result/SentimentBar';
import { TopicCloud } from '@/components/result/TopicCloud';
import { KeyFeedbackList } from '@/components/result/KeyFeedbackList';
import { EmotionTimeline } from '@/components/result/EmotionTimeline';
import { DanmakuList } from '@/components/result/DanmakuList';
import { CommentList } from '@/components/result/CommentList';

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleAnalyze() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      setResult(await analyze(input.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-secondary/40 to-background">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-bold">
            <Sparkles className="h-7 w-7 text-primary" />
            观众反馈分析
          </h1>
          <p className="mt-2 text-muted-foreground">
            输入 B 站视频链接或 BV 号，自动抓取评论与弹幕，AI 生成话题摘要、情感分析与高价值反馈。
          </p>
        </header>

        <div className="mx-auto mb-8 flex max-w-2xl gap-2">
          <Input
            placeholder="粘贴视频链接，或输入 BV 号，如 BV1j4411W7F7"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '开始分析'}
          </Button>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-2xl rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-center text-sm text-muted-foreground">
            正在抓取评论和弹幕并分析，视频热度越高耗时越久…
          </p>
        )}

        {result && !loading && <ResultView result={result} />}
      </div>
    </div>
  );
}

type ResultTab = 'overview' | 'danmaku' | 'comments';

function ResultView({ result }: { result: AnalysisResult }) {
  const { meta } = result;
  const [tab, setTab] = useState<ResultTab>('overview');

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex gap-4 p-4">
          <img
            src={meta.cover}
            alt={meta.title}
            className="h-24 w-40 shrink-0 rounded-md object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{meta.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              UP主 {meta.author} · {meta.view.toLocaleString()} 播放 ·{' '}
              {meta.danmakuCount.toLocaleString()} 弹幕
            </p>
            <div className="mt-2">
              <Badge variant={result.aiGenerated ? 'default' : 'neutral'}>
                {result.aiGenerated ? 'AI 生成' : '本地启发式（未配置 LLM）'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          分析概览
        </TabButton>
        <TabButton active={tab === 'danmaku'} onClick={() => setTab('danmaku')}>
          弹幕
        </TabButton>
        <TabButton active={tab === 'comments'} onClick={() => setTab('comments')}>
          评论
        </TabButton>
      </div>

      {tab === 'overview' && <Overview result={result} />}
      {tab === 'danmaku' && (
        <Card>
          <CardHeader>
            <CardTitle>弹幕</CardTitle>
          </CardHeader>
          <CardContent>
            <DanmakuList key={meta.bvid} bvid={meta.bvid} />
          </CardContent>
        </Card>
      )}
      {tab === 'comments' && (
        <Card>
          <CardHeader>
            <CardTitle>评论</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentList key={meta.bvid} bvid={meta.bvid} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant={active ? 'default' : 'outline'} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

function Overview({ result }: { result: AnalysisResult }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>一句话总结</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>情感分布</CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentBar data={result.sentiment} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>高频话题</CardTitle>
          </CardHeader>
          <CardContent>
            <TopicCloud topics={result.topics} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>弹幕情绪时间轴</CardTitle>
        </CardHeader>
        <CardContent>
          <EmotionTimeline data={result.timeline} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 高价值反馈</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyFeedbackList items={result.keyFeedbacks} />
        </CardContent>
      </Card>
    </>
  );
}
