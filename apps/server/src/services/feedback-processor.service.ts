import { Injectable } from '@nestjs/common';
import type {
  AnalysisJobRecord,
  AnalysisTopic,
  Comment,
  Danmaku,
  EvidenceReference,
  RawDataSnapshot,
  VideoMeta,
} from '../types';
import { buildTimeline, topKeywords } from '../utils/heuristics';

const COMMENT_SAMPLE_LIMIT = 1_200;
const DANMAKU_SAMPLE_LIMIT = 3_000;

export interface FeedbackDigest {
  video: Pick<VideoMeta, 'bvid' | 'title' | 'author' | 'duration' | 'view'>;
  coverage: AnalysisJobRecord['coverage'];
  rawStats: RawDataSnapshot;
  comments: Array<{
    id: string;
    user: string;
    level: number;
    likes: number;
    replies: number;
    text: string;
  }>;
  danmaku: Array<{ id: string; progress: number; weight: number; text: string }>;
}

@Injectable()
export class FeedbackProcessorService {
  buildRawSnapshot(
    danmaku: Danmaku[],
    comments: Comment[],
    duration: number,
  ): RawDataSnapshot {
    const counts = new Array<number>(7).fill(0);
    for (const comment of comments) {
      if (comment.level >= 0 && comment.level < 7) counts[comment.level] += 1;
    }
    const commentLevels = counts.map((count, level) => ({ level, count }));
    return {
      timeline: buildTimeline(danmaku, duration),
      commentLevels,
      topKeywords: topKeywords([
        ...comments.map((item) => item.content),
        ...danmaku.map((item) => item.content),
      ]).slice(0, 12),
    };
  }

  buildDigest(job: AnalysisJobRecord): FeedbackDigest {
    if (!job.meta || !job.raw) throw new Error('原始数据尚未准备完成');
    const comments = this.sampleComments(job.comments);
    const danmaku = this.sampleDanmaku(job.danmaku);
    job.coverage.semanticComments = comments.length;
    job.coverage.semanticDanmaku = danmaku.length;
    return {
      video: {
        bvid: job.meta.bvid,
        title: job.meta.title,
        author: job.meta.author,
        duration: job.meta.duration,
        view: job.meta.view,
      },
      coverage: { ...job.coverage },
      rawStats: job.raw,
      comments: comments.map((comment) => ({
        id: comment.rpid,
        user: comment.uname,
        level: comment.level,
        likes: comment.like,
        replies: comment.replyCount,
        text: comment.content.slice(0, 500),
      })),
      danmaku: danmaku.map((item) => ({
        id: item.id,
        progress: item.progress,
        weight: item.weight,
        text: item.content.slice(0, 200),
      })),
    };
  }

  countTopicMentions(
    topic: Pick<AnalysisTopic, 'label' | 'aliases'>,
    corpus: string[],
  ): number {
    const words = [topic.label, ...topic.aliases]
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length >= 2);
    if (words.length === 0) return 0;
    let count = 0;
    for (const text of corpus) {
      if (words.some((word) => text.includes(word))) count += 1;
    }
    return count;
  }

  resolveEvidence(
    job: AnalysisJobRecord,
    evidence: EvidenceReference[],
  ): EvidenceReference[] {
    const commentById = new Map(job.comments.map((comment) => [comment.rpid, comment]));
    const danmakuById = new Map(job.danmaku.map((danmaku) => [danmaku.id, danmaku]));
    const resolved = new Map<string, EvidenceReference>();
    for (const item of evidence) {
      const key = `${item.source}:${item.id}`;
      if (resolved.has(key)) continue;
      if (item.source === 'comment') {
        const comment = commentById.get(item.id);
        if (comment) {
          resolved.set(key, {
            source: 'comment',
            id: comment.rpid,
            quote: comment.content.slice(0, 500),
          });
        }
      } else {
        const danmaku = danmakuById.get(item.id);
        if (danmaku) {
          resolved.set(key, {
            source: 'danmaku',
            id: danmaku.id,
            quote: danmaku.content.slice(0, 500),
            progress: danmaku.progress,
          });
        }
      }
    }
    return [...resolved.values()];
  }

  validateEvidence(job: AnalysisJobRecord, evidence: EvidenceReference[]): void {
    if (this.resolveEvidence(job, evidence).length !== evidence.length) {
      throw new Error('AI 返回了不存在或重复的证据');
    }
  }

  highValueScore(comment: Comment): number {
    return Math.min(100, Math.round(this.commentScore(comment) * 1.35));
  }

  private sampleComments(comments: Comment[]): Comment[] {
    const selected = new Map<string, Comment>();
    const add = (items: Comment[]) => {
      for (const item of items) {
        if (selected.size >= COMMENT_SAMPLE_LIMIT) break;
        if (item.content.trim()) selected.set(item.rpid, item);
      }
    };

    add(
      comments
        .map((comment) => ({ comment, score: this.commentScore(comment) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 600)
        .map(({ comment }) => comment),
    );
    add(
      comments
        .filter((item) => item.collectedFrom === 'recent' || item.collectedFrom === 'both')
        .slice()
        .sort((a, b) => b.ctime - a.ctime)
        .slice(0, 300),
    );
    add(comments.slice().sort((a, b) => b.content.length - a.content.length).slice(0, 300));
    add(comments);
    return [...selected.values()];
  }

  private sampleDanmaku(items: Danmaku[]): Danmaku[] {
    const unique = new Map<string, Danmaku>();
    for (const item of items) {
      const key = item.content.trim().replace(/\s+/g, ' ');
      if (key && !unique.has(key)) unique.set(key, item);
    }
    const ordered = [...unique.values()].sort((a, b) => a.progress - b.progress);
    if (ordered.length <= DANMAKU_SAMPLE_LIMIT) return ordered;
    const selected = new Map<string, Danmaku>();
    for (const item of ordered.slice().sort((a, b) => b.weight - a.weight).slice(0, 500)) {
      selected.set(item.id, item);
    }
    const remaining = DANMAKU_SAMPLE_LIMIT - selected.size;
    for (let index = 0; index < remaining; index += 1) {
      const position = Math.floor((index / Math.max(1, remaining - 1)) * (ordered.length - 1));
      selected.set(ordered[position].id, ordered[position]);
    }
    return [...selected.values()].sort((a, b) => a.progress - b.progress);
  }

  private commentScore(comment: Comment): number {
    return (
      Math.log2(comment.like + 1) * 12 +
      Math.log2(comment.replyCount + 1) * 10 +
      comment.level * 4 +
      Math.min(24, comment.content.trim().length / 12)
    );
  }
}
