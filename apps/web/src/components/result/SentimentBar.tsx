import type { SentimentBreakdown } from '@/types';

/** 情感分布条：正面/中性/负面占比。 */
export function SentimentBar({ data }: { data: SentimentBreakdown }) {
  const seg = [
    { key: 'positive', label: '正面', value: data.positive, color: 'bg-emerald-500' },
    { key: 'neutral', label: '中性', value: data.neutral, color: 'bg-slate-300' },
    { key: 'negative', label: '负面', value: data.negative, color: 'bg-rose-500' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {seg.map((s) => (
          <div
            key={s.key}
            className={s.color}
            style={{ width: `${Math.round(s.value * 100)}%` }}
            title={`${s.label} ${Math.round(s.value * 100)}%`}
          />
        ))}
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground">
        {seg.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.color}`} />
            {s.label} {Math.round(s.value * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}
