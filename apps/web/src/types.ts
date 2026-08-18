// 前后端共享的数据契约。后端 controller 返回、前端渲染都以此为准。
// 与 apps/web/src/types.ts 保持一致。

/** 一条弹幕（protobuf DanmakuElem 精简后的形态）。 */
export interface Danmaku {
  id: string;
  /** 弹幕在视频内出现的时间，毫秒。 */
  progress: number;
  /** 1/2/3 滚动 4 底部 5 顶部 6 逆向 7 高级 8 代码 9 BAS。 */
  mode: number;
  fontsize: number;
  /** 十进制 RGB。 */
  color: number;
  content: string;
  /** 发送时间，Unix 秒（字符串以防精度丢失）。 */
  ctime: string;
  weight: number;
  pool: number;
  attr: number;
}

/** 一条评论。 */
export interface Comment {
  rpid: string;
  /** 发布者昵称。 */
  uname: string;
  /** 发布者头像 URL。 */
  avatar: string;
  /** 发布者当前等级 0-6。 */
  level: number;
  content: string;
  /** 点赞数。 */
  like: number;
  /** 楼中楼回复数。 */
  replyCount: number;
  /** 发布时间，Unix 秒。 */
  ctime: number;
}

/** 弹幕分页（按时间窗，每页约 2 分钟）。 */
export interface DanmakuPage {
  items: Danmaku[];
  /** 本页窗口起点，毫秒。 */
  start: number;
  /** 本页窗口终点（不含），毫秒。 */
  end: number;
  /** 是否还有更多弹幕。 */
  hasMore: boolean;
}

/** 评论分页（游标翻页）。 */
export interface CommentPage {
  items: Comment[];
  /** 下一页游标，空串表示没有更多。 */
  nextOffset: string;
  /** 是否最后一页。 */
  isEnd: boolean;
  /** 评论总数。 */
  allCount: number;
}

/** 视频基础信息。 */
export interface VideoMeta {
  bvid: string;
  aid: number;
  cid: number;
  title: string;
  /** 封面 URL。 */
  cover: string;
  /** UP 主昵称。 */
  author: string;
  /** 播放量。 */
  view: number;
  /** 弹幕总数。 */
  danmakuCount: number;
  /** 时长，秒。 */
  duration: number;
}

/** 情感分布（占比 0-1）。 */
export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

/** 高频话题 / 热词。 */
export interface Topic {
  keyword: string;
  count: number;
}

/** 一条被筛出的高价值反馈。 */
export interface KeyFeedback {
  content: string;
  /** 来源：弹幕或评论。 */
  source: 'comment' | 'danmaku';
  /** 该反馈为何值得关注（AI 归纳的一句话）。 */
  reason: string;
  /** 情感倾向。 */
  sentiment: 'positive' | 'neutral' | 'negative';
}

/** 弹幕时间轴情绪曲线的一个采样点。 */
export interface TimelinePoint {
  /** 桶起始时间，秒。 */
  time: number;
  /** 该时间桶内弹幕条数（观众反应强度）。 */
  count: number;
  /** 该时间桶的情感倾向 -1~1。 */
  sentiment: number;
}

/** 一次完整分析的结果。 */
export interface AnalysisResult {
  meta: VideoMeta;
  summary: string;
  topics: Topic[];
  sentiment: SentimentBreakdown;
  keyFeedbacks: KeyFeedback[];
  timeline: TimelinePoint[];
  /** 是否由 LLM 生成（false 表示回退到本地启发式）。 */
  aiGenerated: boolean;
}

/** POST /api/analysis 请求体。 */
export interface AnalyzeRequest {
  /** 视频链接或 BV 号。 */
  input: string;
}
