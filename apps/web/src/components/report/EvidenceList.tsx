import { Clock3, MessageSquareText, Radio } from 'lucide-react';
import type { EvidenceReference } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatMilliseconds } from '@/lib/utils';

export function EvidenceList({ items }: { items: EvidenceReference[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={`${item.source}-${item.id}-${index}`} className="rounded-lg bg-muted/60 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {item.source === 'comment' ? <MessageSquareText className="size-3" /> : <Radio className="size-3" />}
              {item.source === 'comment' ? '评论' : '弹幕'}
            </Badge>
            {item.progress !== undefined ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{formatMilliseconds(item.progress)}</span> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">“{item.quote}”</p>
        </div>
      ))}
    </div>
  );
}
