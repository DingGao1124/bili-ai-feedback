import type {
  Comment,
  Danmaku,
  KeyFeedback,
  SentimentBreakdown,
  TimelinePoint,
  Topic,
} from '../types';

// 无 LLM 时的本地兜底：保证 demo 端到端可跑。质量有限，正式分析靠 LLM。

// 简易停用词，过滤后统计高频词。
const STOPWORDS = new Set([
  '的', '了', '是', '我', '你', '他', '她', '它', '们', '这', '那', '有', '在',
  '和', '就', '都', '也', '要', '不', '很', '啊', '吧', '呢', '哦', '嗯', '什么',
  '一个', '这个', '那个', '可以', '没有', '就是', '这样', '真的', '哈哈', '哈哈哈',
]);

const POSITIVE = ['好', '赞', '喜欢', '棒', '强', '爱', '优秀', '厉害', '支持', '牛', '感谢', '期待'];
const NEGATIVE = ['差', '烂', '难看', '无聊', '失望', '垃圾', '讨厌', '不行', '尬', '水', '退', '骗'];

function scoreSentiment(text: string): number {
  let s = 0;
  for (const w of POSITIVE) if (text.includes(w)) s += 1;
  for (const w of NEGATIVE) if (text.includes(w)) s -= 1;
  return s;
}

export function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const s = scoreSentiment(text);
  if (s > 0) return 'positive';
  if (s < 0) return 'negative';
  return 'neutral';
}

/** 全量文本的情感分布（占比）。 */
export function sentimentBreakdown(texts: string[]): SentimentBreakdown {
  let pos = 0;
  let neg = 0;
  let neu = 0;
  for (const t of texts) {
    const c = classifySentiment(t);
    if (c === 'positive') pos += 1;
    else if (c === 'negative') neg += 1;
    else neu += 1;
  }
  const total = Math.max(1, texts.length);
  return { positive: pos / total, neutral: neu / total, negative: neg / total };
}

/** 2-gram 中文分词后的高频词（粗糙但够 demo 用）。 */
export function topKeywords(texts: string[], topN = 15): Topic[] {
  const freq = new Map<string, number>();
  for (const raw of texts) {
    const clean = raw.replace(/[^一-龥A-Za-z0-9]/g, ' ');
    for (const seg of clean.split(/\s+/)) {
      if (seg.length < 2) continue;
      // 纯数字无意义，跳过（如 20/02/2026）。
      if (/^\d+$/.test(seg)) continue;
      // 英文/数字整词计一次
      if (/^[A-Za-z0-9]+$/.test(seg)) {
        bump(freq, seg.toLowerCase());
        continue;
      }
      // 中文按 2-gram 滑窗
      for (let i = 0; i + 2 <= seg.length; i += 1) {
        const gram = seg.slice(i, i + 2);
        // 含数字的 2-gram（如「6年」「25」）与全同字符（如「啊啊」「得得」）无意义，跳过。
        if (/[\d]/.test(gram) || gram[0] === gram[1]) continue;
        if (STOPWORDS.has(gram)) continue;
        bump(freq, gram);
      }
    }
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([keyword, count]) => ({ keyword, count }));
}

function bump(m: Map<string, number>, k: string): void {
  m.set(k, (m.get(k) ?? 0) + 1);
}

/** 弹幕时间轴情绪曲线：按 bucketSec 秒分桶统计条数与平均情感。 */
export function buildTimeline(danmaku: Danmaku[], durationSec: number): TimelinePoint[] {
  const bucketSec = Math.max(5, Math.round(durationSec / 60)); // 约 60 个采样点
  const buckets = new Map<number, { count: number; sentiment: number }>();
  for (const d of danmaku) {
    const time = Math.floor(d.progress / 1000 / bucketSec) * bucketSec;
    const b = buckets.get(time) ?? { count: 0, sentiment: 0 };
    b.count += 1;
    b.sentiment += scoreSentiment(d.content);
    buckets.set(time, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, b]) => ({
      time,
      count: b.count,
      sentiment: b.count ? clamp(b.sentiment / b.count, -1, 1) : 0,
    }));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 高价值反馈筛选（本地兜底）：评论按 等级×活跃 加权点赞排序，取带负面/建议信号的优先。
 */
export function pickKeyFeedbacks(comments: Comment[], topN = 5): KeyFeedback[] {
  const scored = comments.map((c) => ({
    c,
    score: c.like + c.replyCount * 3 + c.level * 5,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(({ c }) => ({
    content: c.content,
    source: 'comment' as const,
    reason: `等级 LV${c.level} 用户，获赞 ${c.like}、回复 ${c.replyCount}`,
    sentiment: classifySentiment(c.content),
  }));
}
