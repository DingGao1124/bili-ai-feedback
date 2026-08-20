import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchAnalysisReport } from '@/api/analysis';
import { ReportDashboard } from '@/components/report/ReportDashboard';
import type { AnalysisReport } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ReportPage() {
  const { jobId } = useParams();
  const [report, setReport] = useState<AnalysisReport>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    void fetchAnalysisReport(jobId)
      .then((result) => active && setReport(result))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : '报告加载失败'));
    return () => { active = false; };
  }, [jobId]);

  return (
    <main className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-4"><Button variant="ghost" asChild><Link to={jobId ? `/workspace/${jobId}` : '/'}><ArrowLeft data-icon="inline-start" />返回分析过程</Link></Button><p className="text-sm text-muted-foreground">观众反馈 AI 创作复盘</p></div>
      {error ? <Alert variant="destructive"><AlertTitle>报告暂不可用</AlertTitle><AlertDescription className="flex flex-col items-start gap-3"><span>{error}</span><Button variant="outline" asChild><Link to="/">返回首页，重新分析</Link></Button></AlertDescription></Alert> : null}
      {!report && !error ? <div className="flex min-h-[520px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在加载分析报告…</div> : null}
      {report ? <ReportDashboard report={report} /> : null}
    </main>
  );
}
