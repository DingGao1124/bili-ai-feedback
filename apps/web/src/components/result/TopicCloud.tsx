import type { Topic } from '@/types';

/** 高频话题：字号随词频放大。 */
export function TopicCloud({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无足够数据提取热词。</p>;
  }
  const max = Math.max(...topics.map((t) => t.count));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {topics.map((t) => {
        const scale = 0.85 + (t.count / max) * 0.9;
        return (
          <span
            key={t.keyword}
            className="font-medium text-primary/90"
            style={{ fontSize: `${scale}rem` }}
            title={`出现 ${t.count} 次`}
          >
            {t.keyword}
            <sup className="ml-0.5 text-xs text-muted-foreground">{t.count}</sup>
          </span>
        );
      })}
    </div>
  );
}
