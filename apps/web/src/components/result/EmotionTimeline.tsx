import type { TimelinePoint } from '@/types';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 弹幕时间轴情绪曲线：面积 = 弹幕密度（反应强度），配合时间定位高潮段。 */
export function EmotionTimeline({ data }: { data: TimelinePoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">该视频暂无弹幕数据。</p>;
  }
  const chartData = data.map((p) => ({ ...p, label: fmtTime(p.time) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="dm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(337 82% 56%)" stopOpacity={0.7} />
            <stop offset="95%" stopColor="hsl(337 82% 56%)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="label" fontSize={11} tickLine={false} minTickGap={24} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v) => [`${v} 条`, '弹幕数']}
          labelFormatter={(l) => `时间 ${l}`}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(337 82% 56%)"
          fill="url(#dm)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
