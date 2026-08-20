import { useEffect } from 'react';
import {
  analysisEventsUrl,
  fetchAnalysisEventHistory,
  fetchAnalysisJob,
} from '@/api/analysis';
import { useAnalysisStore } from '@/stores/analysis-store';
import type { AnalysisEventType, AnalysisStreamEvent } from '@/types';

const EVENT_TYPES: AnalysisEventType[] = [
  'status',
  'progress',
  'meta_ready',
  'message_delta',
  'reasoning_delta',
  'tool_call',
  'tool_result',
  'section_saved',
  'completed',
  'failed',
];

export function useAnalysisStream(jobId?: string): void {
  const setJob = useAnalysisStore((state) => state.setJob);
  const applyEvents = useAnalysisStore((state) => state.applyEvents);
  const reset = useAnalysisStore((state) => state.reset);

  useEffect(() => {
    if (!jobId) return;
    let disposed = false;
    let source: EventSource | undefined;
    let frame: number | undefined;
    let shouldRefresh = false;
    const pending: AnalysisStreamEvent[] = [];

    if (useAnalysisStore.getState().job?.id !== jobId) reset();

    const flush = () => {
      frame = undefined;
      if (disposed) return;
      if (pending.length > 0) applyEvents(pending.splice(0));
      if (shouldRefresh) {
        shouldRefresh = false;
        void refresh();
      }
    };

    const enqueue = (event: AnalysisStreamEvent) => {
      pending.push(event);
      if (frame === undefined) frame = window.requestAnimationFrame(flush);
    };

    const refresh = async () => {
      const job = await fetchAnalysisJob(jobId);
      if (!disposed) setJob(job);
      return job;
    };

    void refresh()
      .then(async (job) => {
        const after = useAnalysisStore.getState().lastSeq;
        const history = await fetchAnalysisEventHistory(jobId, after);
        if (disposed) return;
        applyEvents(history);
        if (job.status === 'completed' || job.status.endsWith('_failed')) return;

        if (disposed) return;
        const lastSeq = useAnalysisStore.getState().lastSeq;
        source = new EventSource(analysisEventsUrl(jobId, lastSeq));
        for (const type of EVENT_TYPES) {
          source.addEventListener(type, (message) => {
            const event = JSON.parse((message as MessageEvent<string>).data) as AnalysisStreamEvent;
            enqueue(event);
            // meta_ready / status 触发时刷新 job，让视频信息、原始数据一就绪即展示，不必等最终 completed
            if (type === 'meta_ready' || type === 'status' || type === 'completed' || type === 'failed') {
              shouldRefresh = true;
            }
            if (type === 'completed' || type === 'failed') {
              if (frame !== undefined) window.cancelAnimationFrame(frame);
              flush();
              source?.close();
            }
          });
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      source?.close();
    };
  }, [applyEvents, jobId, reset, setJob]);
}
