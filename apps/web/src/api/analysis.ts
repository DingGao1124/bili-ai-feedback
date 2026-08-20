import { request } from '@/api/client';
import type {
  AnalysisJobView,
  AnalysisReport,
  AnalysisStreamEvent,
  Comment,
  Danmaku,
  PageResult,
} from '@/types';

export function createAnalysis(input: string): Promise<AnalysisJobView> {
  return request('/api/analysis/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input }),
  });
}

export function fetchAnalysisJob(jobId: string): Promise<AnalysisJobView> {
  return request(`/api/analysis/jobs/${encodeURIComponent(jobId)}`);
}

export function fetchAnalysisReport(jobId: string): Promise<AnalysisReport> {
  return request(`/api/analysis/jobs/${encodeURIComponent(jobId)}/report`);
}

export function retryAnalysis(jobId: string): Promise<AnalysisJobView> {
  return request(`/api/analysis/jobs/${encodeURIComponent(jobId)}/retry`, { method: 'POST' });
}

export function analysisEventsUrl(jobId: string, after: number): string {
  return `/api/analysis/jobs/${encodeURIComponent(jobId)}/events?after=${after}`;
}

export function fetchAnalysisEventHistory(
  jobId: string,
  after = 0,
): Promise<AnalysisStreamEvent[]> {
  return request(
    `/api/analysis/jobs/${encodeURIComponent(jobId)}/events/history?after=${after}`,
  );
}

export function fetchJobDanmaku(
  jobId: string,
  options: { offset?: number; limit?: number; query?: string; start?: number; end?: number },
): Promise<PageResult<Danmaku>> {
  const params = toParams(options);
  return request(`/api/analysis/jobs/${encodeURIComponent(jobId)}/raw/danmaku?${params}`);
}

export function fetchJobComments(
  jobId: string,
  options: { offset?: number; limit?: number; query?: string; level?: number },
): Promise<PageResult<Comment>> {
  const params = toParams(options);
  return request(`/api/analysis/jobs/${encodeURIComponent(jobId)}/raw/comments?${params}`);
}

function toParams(values: Record<string, string | number | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params;
}
