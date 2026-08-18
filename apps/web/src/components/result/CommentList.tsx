import { useEffect, useRef, useState } from 'react';
import type { Comment } from '@/types';
import { Loader2 } from 'lucide-react';

import { fetchComments } from '@/lib/api';
import { Button } from '@/components/ui/button';

function fmtDate(sec: number): string {
  if (!sec) return '';
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 评论分页列表：游标「加载更多」，默认按热度。 */
export function CommentList({ bvid }: { bvid: string }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [offset, setOffset] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inited = useRef(false);

  async function loadMore(nextOffset: string) {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const page = await fetchComments(bvid, { offset: nextOffset });
      setItems((prev) => [...prev, ...page.items]);
      setOffset(page.nextOffset);
      setHasMore(!page.isEnd && page.nextOffset !== '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载评论失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    void loadMore('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.length === 0 && !loading && !error && (
        <p className="text-sm text-muted-foreground">该视频暂无评论。</p>
      )}
      <ul className="space-y-4">
        {items.map((c) => (
          <li key={c.rpid} className="flex gap-3">
            {c.avatar ? (
              <img
                src={c.avatar}
                alt={c.uname}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                {c.uname.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.uname}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5">
                  LV{c.level}
                </span>
                <span>{fmtDate(c.ctime)}</span>
              </div>
              <p className="mt-1 break-all text-sm leading-relaxed">{c.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                👍 {c.like.toLocaleString()} · 回复 {c.replyCount.toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMore(offset)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
}
