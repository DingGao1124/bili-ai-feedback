import { useEffect, useRef, useState } from 'react';
import type { Danmaku } from '@/types';
import { Loader2 } from 'lucide-react';

import { fetchDanmaku } from '@/lib/api';
import { Button } from '@/components/ui/button';

const MODE_LABEL: Record<number, string> = {
  1: '滚动',
  2: '滚动',
  3: '滚动',
  4: '底部',
  5: '顶部',
  6: '逆向',
  7: '高级',
  8: '代码',
  9: 'BAS',
};

function fmtMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** 弹幕分页列表：按 2 分钟时间窗「加载更多」。 */
export function DanmakuList({ bvid }: { bvid: string }) {
  const [items, setItems] = useState<Danmaku[]>([]);
  const [start, setStart] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inited = useRef(false);

  async function loadMore(nextStart: number) {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const page = await fetchDanmaku(bvid, nextStart);
      setItems((prev) => [...prev, ...page.items]);
      setStart(page.end);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载弹幕失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    void loadMore(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.length === 0 && !loading && !error && (
        <p className="text-sm text-muted-foreground">该视频暂无弹幕。</p>
      )}
      <ul className="divide-y">
        {items.map((d, i) => (
          <li
            key={`${d.id}-${i}`}
            className="flex items-start gap-2.5 py-2 text-sm"
          >
            <span className="shrink-0 font-mono text-xs leading-6 text-muted-foreground">
              {fmtMs(d.progress)}
            </span>
            <span className="mt-1 shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
              {MODE_LABEL[d.mode] ?? `模式${d.mode}`}
            </span>
            <span
              className="mt-1.5 h-3 w-3 shrink-0 rounded-full border"
              style={{ backgroundColor: toHex(d.color) }}
              title={toHex(d.color)}
            />
            <span className="break-all leading-6">{d.content}</span>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMore(start)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
}
