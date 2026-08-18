import type {
  AnalysisResult,
  AnalyzeRequest,
  CommentPage,
  DanmakuPage,
} from '@/types';

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `请求失败 (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

/** 调用后端分析接口。走 vite 代理到 :3001。 */
export async function analyze(input: string): Promise<AnalysisResult> {
  const body: AnalyzeRequest = { input };
  const res = await fetch('/api/analysis', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `请求失败 (HTTP ${res.status})`);
  }
  return (await res.json()) as AnalysisResult;
}

/** 拉取一个时间窗（2 分钟）的弹幕。start 为窗口起点毫秒。 */
export function fetchDanmaku(bvid: string, start: number): Promise<DanmakuPage> {
  return request<DanmakuPage>(
    `/api/bilibili/${encodeURIComponent(bvid)}/danmaku?start=${start}`,
  );
}

/** 拉取一页评论。mode=2 按时间，mode=3 按热度；offset 为游标。 */
export function fetchComments(
  bvid: string,
  opts: { mode?: 2 | 3; offset?: string } = {},
): Promise<CommentPage> {
  const params = new URLSearchParams();
  if (opts.mode) params.set('mode', String(opts.mode));
  if (opts.offset) params.set('offset', opts.offset);
  const qs = params.toString();
  return request<CommentPage>(
    `/api/bilibili/${encodeURIComponent(bvid)}/comments${qs ? `?${qs}` : ''}`,
  );
}
