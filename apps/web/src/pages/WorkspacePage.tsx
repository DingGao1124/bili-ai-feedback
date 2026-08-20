import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { createAnalysis, retryAnalysis } from '@/api/analysis';
import { AgentProcessPanel } from '@/components/workspace/AgentProcessPanel';
import { RawDataPanel } from '@/components/workspace/RawDataPanel';
import { VideoCard } from '@/components/common/VideoCard';
import { useAnalysisStream } from '@/hooks/use-analysis-stream';
import { useAnalysisStore } from '@/stores/analysis-store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function WorkspacePage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const job = useAnalysisStore((state) => state.job);
  const reset = useAnalysisStore((state) => state.reset);
  const setJob = useAnalysisStore((state) => state.setJob);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  useAnalysisStream(jobId);

  useEffect(() => {
    if (!jobId && job) reset();
  }, [job, jobId, reset]);

  const submit = async () => {
    const value = input.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const created = await createAnalysis(value);
      reset(created);
      navigate(`/workspace/${created.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '创建分析任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = async () => {
    if (!jobId) return;
    setSubmitting(true);
    try {
      setJob(await retryAnalysis(jobId));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '重试失败');
    } finally {
      setSubmitting(false);
    }
  };

  const activeJob = job?.id === jobId ? job : undefined;

  return (
    <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <SearchPanel input={input} setInput={setInput} submit={submit} submitting={submitting} />
      {submitError ? <Alert variant="destructive"><AlertTitle>无法开始分析</AlertTitle><AlertDescription>{submitError}</AlertDescription></Alert> : null}

      {!jobId ? <LandingState /> : null}
      {jobId ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="flex min-w-0 flex-col gap-5">
            {activeJob?.meta ? <VideoCard meta={activeJob.meta} coverage={activeJob.coverage} /> : <Card><CardContent className="flex min-h-32 items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在读取视频信息…</CardContent></Card>}

            {activeJob?.error ? (
              <Alert variant="destructive">
                <AlertTitle>{activeJob.status === 'ai_failed' ? 'AI 分析未完成' : '数据获取失败'}</AlertTitle>
                <AlertDescription className="flex flex-col items-start gap-3"><span>{activeJob.error}</span>{activeJob.status === 'ai_failed' ? <Button variant="outline" size="sm" onClick={() => void retry()} disabled={submitting}><RefreshCw data-icon="inline-start" />重新分析</Button> : null}</AlertDescription>
              </Alert>
            ) : null}

            {activeJob ? <RawDataPanel job={activeJob} /> : null}

            <Card className={activeJob?.resultReady ? 'border-primary/30 bg-primary/[0.04]' : undefined}>
              <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div><p className="font-semibold">AI 创作复盘报告</p><p className="mt-1 text-sm text-muted-foreground">{activeJob?.resultReady ? '话题、核心反馈与下一期建议已经准备完成。' : '完成所有分析和证据校验后开放。'}</p></div>
                {activeJob?.resultReady ? <Button asChild><Link to={`/report/${activeJob.id}`}>查看分析报告<ArrowRight data-icon="inline-end" /></Link></Button> : <Button disabled><Loader2 className="animate-spin" data-icon="inline-start" />等待分析完成</Button>}
              </CardContent>
            </Card>
          </div>
          <AgentProcessPanel />
        </div>
      ) : null}
    </main>
  );
}

function SearchPanel({ input, setInput, submit, submitting }: { input: string; setInput: (value: string) => void; submit: () => void; submitting: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3"><span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex"><Search className="size-5" /></span><Input id="video-input" name="video-input" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder="输入视频链接或 BV 号，例如 BV1j4411W7F7" className="h-11" /></div>
        <Button size="lg" onClick={submit} disabled={submitting || !input.trim()}>{submitting ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}开始分析</Button>
      </CardContent>
    </Card>
  );
}

function LandingState() {
  return (
    <Card className="overflow-hidden border-dashed">
      <CardContent className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BarChart3 className="size-8" /></span>
        <h1 className="mt-6 text-2xl font-semibold sm:text-3xl">从海量评论与弹幕里，找到下一期的答案</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">抓取视频弹幕和评论，展示真实数据分布，再由 AI 提炼高频话题、情绪倾向、高价值反馈和可执行的创作建议。</p>
        <div className="mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3"><Feature title="先看原始数据" detail="弹幕密度、评论等级与完整反馈列表" /><Feature title="过程实时可见" detail="分析步骤、思考内容和工具写入状态" /><Feature title="建议可追溯" detail="每条洞察都关联真实评论或弹幕证据" /></div>
      </CardContent>
    </Card>
  );
}

function Feature({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl bg-muted/70 p-4"><p className="font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>;
}
