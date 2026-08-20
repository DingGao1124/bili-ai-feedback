import { describe, expect, test } from 'bun:test';
import { FeedbackProcessorService } from '../src/services/feedback-processor.service';
import { AnalysisJobStore } from '../src/services/analysis-job.store';
import type { AnalysisJobRecord, Comment, Danmaku, VideoMeta } from '../src/types';

const meta: VideoMeta = {
  bvid: 'BV1j4411W7F7',
  aid: 1,
  cid: 2,
  title: '测试视频',
  cover: '',
  author: '测试UP主',
  view: 1000,
  danmakuCount: 2,
  duration: 120,
};

const comments: Comment[] = [
  { rpid: 'c1', uname: '观众A', avatar: '', level: 6, content: '希望下一期增加参数对比', like: 100, replyCount: 8, ctime: 1, collectedFrom: 'hot' },
  { rpid: 'c2', uname: '观众B', avatar: '', level: 4, content: '节奏有点快，案例可以讲久一点', like: 20, replyCount: 3, ctime: 2, collectedFrom: 'recent' },
];

const danmaku: Danmaku[] = [
  { id: 'd1', progress: 10_000, mode: 1, fontsize: 25, color: 0xffffff, content: '这里讲得好', ctime: '1', weight: 5, pool: 0, attr: 0 },
  { id: 'd2', progress: 70_000, mode: 1, fontsize: 25, color: 0xffffff, content: '参数对比呢', ctime: '2', weight: 8, pool: 0, attr: 0 },
];

describe('FeedbackProcessorService', () => {
  const processor = new FeedbackProcessorService();

  test('构建原始统计与分层语义摘要', () => {
    const raw = processor.buildRawSnapshot(danmaku, comments, meta.duration);
    expect(raw.commentLevels.find((item) => item.level === 6)?.count).toBe(1);
    expect(raw.timeline.reduce((sum, item) => sum + item.count, 0)).toBe(2);

    const job = {
      meta,
      raw,
      danmaku,
      comments,
      coverage: {
        danmakuFetched: 2,
        danmakuTotal: 2,
        commentsFetched: 2,
        commentsTotal: 2,
        semanticDanmaku: 0,
        semanticComments: 0,
      },
    } as AnalysisJobRecord;
    const digest = processor.buildDigest(job);
    expect(digest.comments).toHaveLength(2);
    expect(digest.danmaku).toHaveLength(2);
    expect(job.coverage.semanticComments).toBe(2);
  });

  test('拒绝 Agent 编造的证据 ID', () => {
    const job = { comments, danmaku } as AnalysisJobRecord;
    expect(() => processor.validateEvidence(job, [{ source: 'comment', id: 'missing', quote: '伪造内容' }])).toThrow('不存在');
  });

  test('按证据 ID 回填真实原文并过滤无效引用', () => {
    const job = { comments, danmaku } as AnalysisJobRecord;
    const resolved = processor.resolveEvidence(job, [
      { source: 'comment', id: 'c1', quote: '模型改写的内容' },
      { source: 'danmaku', id: 'd2', quote: '不真实的引文', progress: 1 },
      { source: 'comment', id: 'missing', quote: '伪造内容' },
    ]);
    expect(resolved).toEqual([
      { source: 'comment', id: 'c1', quote: comments[0].content },
      { source: 'danmaku', id: 'd2', quote: danmaku[1].content, progress: 70_000 },
    ]);
  });
});

describe('AnalysisJobStore', () => {
  test('事件带递增序号并支持断线补发', () => {
    const store = new AnalysisJobStore();
    const job = store.create(meta.bvid, meta.bvid);
    store.emit(job.id, 'progress', { progress: 10 });
    store.emit(job.id, 'progress', { progress: 20 });
    const replay = store.eventsAfter(job.id, 1);
    expect(replay.map((event) => event.seq)).toEqual([2, 3]);
  });
});
