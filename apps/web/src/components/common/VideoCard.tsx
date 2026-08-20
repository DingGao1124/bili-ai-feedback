import { MessageSquareText, Play, Radio } from 'lucide-react';
import type { AnalysisCoverage, VideoMeta } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCompactNumber } from '@/lib/utils';

export function VideoCard({ meta, coverage }: { meta: VideoMeta; coverage?: AnalysisCoverage }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
        <img
          src={meta.cover}
          alt={meta.title}
          className="aspect-video w-full rounded-xl object-cover sm:w-52"
          referrerPolicy="no-referrer"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          <div>
            <h2 className="line-clamp-2 text-lg font-semibold leading-7">{meta.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">UP主 · {meta.author}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5"><Play className="size-3" />{formatCompactNumber(meta.view)} 播放</Badge>
            <Badge variant="secondary" className="gap-1.5"><Radio className="size-3" />{formatCompactNumber(meta.danmakuCount)} 弹幕</Badge>
            {coverage ? (
              <Badge variant="outline" className="gap-1.5"><MessageSquareText className="size-3" />{coverage.commentsFetched.toLocaleString()} 条评论样本</Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
