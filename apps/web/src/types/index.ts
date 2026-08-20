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
  collectedFrom?: 'hot' | 'recent' | 'both';
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

export interface TimelinePoint {
  time: number;
  count: number;
  sentiment: number;
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

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface ToolTrace {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
}
