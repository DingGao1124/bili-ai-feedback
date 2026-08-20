/** B站原始数据与分析任务的统一契约。前端 types 目录保持同构。 */

export interface Danmaku {
  id: string;
  progress: number;
  mode: number;
  fontsize: number;
  color: number;
  content: string;
  ctime: string;
  weight: number;
  pool: number;
  attr: number;
}

export interface Comment {
  rpid: string;
  uname: string;
  avatar: string;
  level: number;
  content: string;
  like: number;
  replyCount: number;
  ctime: number;
  /** 该评论是否来自“热门”或“最新”抓取集合。 */
  collectedFrom?: 'hot' | 'recent' | 'both';
}

export interface DanmakuPage {
  items: Danmaku[];
  start: number;
  end: number;
  hasMore: boolean;
}

export interface CommentPage {
  items: Comment[];
  nextOffset: string;
  isEnd: boolean;
  allCount: number;
}

export interface VideoMeta {
  bvid: string;
  aid: number;
  cid: number;
  title: string;
  cover: string;
  author: string;
  view: number;
  danmakuCount: number;
  duration: number;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface Topic {
  keyword: string;
  count: number;
}

/** 旧启发式工具保留的最小反馈类型。 */
export interface KeyFeedback {
  content: string;
  source: 'comment' | 'danmaku';
  reason: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface TimelinePoint {
  time: number;
  count: number;
  sentiment: number;
}

export type AnalysisJobStatus =
  | 'queued'
  | 'fetching'
  | 'preprocessing'
  | 'semantic_mapping'
  | 'agent_running'
  | 'validating'
  | 'completed'
  | 'fetch_failed'
  | 'ai_failed';

export interface AnalysisCoverage {
  danmakuFetched: number;
  danmakuTotal: number;
  commentsFetched: number;
  commentsTotal: number;
  semanticDanmaku: number;
  semanticComments: number;
}

export interface CommentLevelBucket {
  level: number;
  count: number;
}

export interface RawDataSnapshot {
  timeline: TimelinePoint[];
  commentLevels: CommentLevelBucket[];
  topKeywords: Topic[];
}

export interface EvidenceReference {
  source: 'comment' | 'danmaku';
  id: string;
  quote: string;
  progress?: number;
}

export interface AnalysisTopic {
  label: string;
  count: number;
  aliases: string[];
  insight: string;
  evidence: EvidenceReference[];
}

export interface CoreFeedback {
  title: string;
  insight: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'neutral' | 'negative';
  evidence: EvidenceReference[];
}

export interface HighValueFeedback {
  id: string;
  uname: string;
  level: number;
  content: string;
  score: number;
  signals: string[];
  reason: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface CreationSuggestion {
  title: string;
  category: 'content' | 'structure' | 'topic' | 'interaction' | 'expression';
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  evidence: EvidenceReference[];
}

export interface AnalysisReport {
  meta: VideoMeta;
  summary: string;
  topics: AnalysisTopic[];
  sentiment: SentimentBreakdown;
  timeline: TimelinePoint[];
  coreFeedbacks: CoreFeedback[];
  highValueFeedbacks: HighValueFeedback[];
  suggestions: CreationSuggestion[];
  coverage: AnalysisCoverage;
  generatedAt: string;
}

export type AnalysisEventType =
  | 'status'
  | 'progress'
  | 'meta_ready'
  | 'message_delta'
  | 'reasoning_delta'
  | 'tool_call'
  | 'tool_result'
  | 'section_saved'
  | 'completed'
  | 'failed';

export interface AnalysisStreamEvent {
  jobId: string;
  seq: number;
  timestamp: string;
  type: AnalysisEventType;
  data: Record<string, unknown>;
}

export interface AnalysisJobView {
  id: string;
  input: string;
  bvid: string;
  status: AnalysisJobStatus;
  stageLabel: string;
  progress: number;
  createdAt: string;
  expiresAt: string;
  meta?: VideoMeta;
  coverage: AnalysisCoverage;
  raw?: RawDataSnapshot;
  resultReady: boolean;
  error?: string;
}

export interface AnalyzeRequest {
  input: string;
}

/** 仅供服务端任务管线使用，不直接通过 API 返回。 */
export interface AnalysisJobRecord extends AnalysisJobView {
  danmaku: Danmaku[];
  comments: Comment[];
  events: AnalysisStreamEvent[];
  partialReport: Partial<AnalysisReport>;
  report?: AnalysisReport;
}
