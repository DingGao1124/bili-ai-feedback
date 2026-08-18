import type { KeyFeedback } from '@/types';
import { Badge } from '@/components/ui/badge';

const SENTIMENT_LABEL: Record<KeyFeedback['sentiment'], string> = {
  positive: '正面',
  neutral: '中性',
  negative: '负面',
};

/** Top5 高价值反馈列表。 */
export function KeyFeedbackList({ items }: { items: KeyFeedback[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无高价值反馈。</p>;
  }
  return (
    <ol className="space-y-3">
      {items.map((f, i) => (
        <li key={i} className="rounded-lg border bg-secondary/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {i + 1}
            </span>
            <Badge variant={f.sentiment}>{SENTIMENT_LABEL[f.sentiment]}</Badge>
            <Badge variant="outline">
              {f.source === 'comment' ? '评论' : '弹幕'}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed">{f.content}</p>
          <p className="mt-2 text-xs text-muted-foreground">💡 {f.reason}</p>
        </li>
      ))}
    </ol>
  );
}
