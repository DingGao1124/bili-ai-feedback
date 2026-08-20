import { Injectable } from '@nestjs/common';
import type { AnalysisJobView, AnalysisReport } from '../types';
import { BilibiliService } from './bilibili.service';
import { AnalysisJobStore } from './analysis-job.store';
import { FeedbackProcessorService } from './feedback-processor.service';
import { FeedbackAgentService } from './feedback-agent.service';

type QueuedTask = { jobId: string; mode: 'full' | 'ai-only' };

@Injectable()
export class AnalysisService {
  private readonly queue: QueuedTask[] = [];
  private readonly queuedKeys = new Set<string>();
  private active = 0;
  private readonly maxConcurrent = 2;

  constructor(
    private readonly bili: BilibiliService,
    private readonly jobs: AnalysisJobStore,
    private readonly processor: FeedbackProcessorService,
    private readonly agent: FeedbackAgentService,
  ) {}

  create(input: string): AnalysisJobView {
    const bvid = this.bili.parseBvid(input);
    const job = this.jobs.create(input, bvid);
    this.enqueue({ jobId: job.id, mode: 'full' });
    return job;
  }

  retry(jobId: string): AnalysisJobView {
    this.jobs.resetAi(jobId);
    this.enqueue({ jobId, mode: 'ai-only' });
    return this.jobs.getView(jobId);
  }

  private enqueue(task: QueuedTask): void {
    const key = `${task.jobId}:${task.mode}`;
    if (this.queuedKeys.has(key)) return;
    this.queuedKeys.add(key);
    this.queue.push(task);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.queuedKeys.delete(`${task.jobId}:${task.mode}`);
      this.active += 1;
      void this.runTask(task).finally(() => {
        this.active -= 1;
        void this.processQueue();
      });
    }
  }

  private async runTask(task: QueuedTask): Promise<void> {
    if (task.mode === 'full') {
      try {
        await this.fetchAndPrepare(task.jobId);
      } catch (error) {
        this.jobs.fail(task.jobId, 'fetch_failed', this.message(error));
        return;
      }
    }

    try {
      await this.runAi(task.jobId);
    } catch (error) {
      this.jobs.fail(task.jobId, 'ai_failed', this.message(error));
    }
  }

  private async fetchAndPrepare(jobId: string): Promise<void> {
    this.jobs.setStatus(jobId, 'fetching', '读取视频信息', 3);
    const job = this.jobs.getRecord(jobId);
    const meta = await this.bili.getVideoMeta(job.bvid);
    this.jobs.setMeta(jobId, meta);
    this.jobs.setProgress(jobId, 8, '视频信息读取完成，开始抓取弹幕和评论');

    const [danmaku, commentResult] = await Promise.all([
      this.bili.getDanmaku(meta, (completed, total) => {
        this.jobs.setProgress(
          jobId,
          8 + (completed / total) * 36,
          `弹幕时间窗 ${completed}/${total}`,
        );
      }),
      this.bili.getCommentsForAnalysis(meta, (fetched, target) => {
        this.jobs.setProgress(
          jobId,
          8 + Math.min(1, fetched / target) * 36,
          `已抓取评论 ${fetched}/${target}`,
        );
      }),
    ]);

    this.jobs.patchCoverage(jobId, {
      commentsTotal: commentResult.allCount,
      commentsFetched: commentResult.items.length,
      danmakuFetched: danmaku.length,
    });
    this.jobs.setStatus(jobId, 'preprocessing', '整理原始数据与统计图表', 48);
    const raw = this.processor.buildRawSnapshot(
      danmaku,
      commentResult.items,
      meta.duration,
    );
    this.jobs.setRawData(jobId, { danmaku, comments: commentResult.items, raw });
    this.jobs.setProgress(jobId, 55, '原始数据已就绪');
  }

  private async runAi(jobId: string): Promise<void> {
    this.jobs.setStatus(jobId, 'semantic_mapping', '构建分层语义样本', 58);
    const digest = this.processor.buildDigest(this.jobs.getRecord(jobId));
    this.jobs.patchCoverage(jobId, {
      semanticComments: digest.comments.length,
      semanticDanmaku: digest.danmaku.length,
    });
    this.jobs.setProgress(
      jobId,
      64,
      `语义样本：${digest.comments.length} 条评论、${digest.danmaku.length} 条弹幕`,
    );
    this.jobs.setStatus(jobId, 'agent_running', 'AI 正在归纳反馈并写入报告', 68);
    await this.agent.run(jobId, digest);

    this.jobs.setStatus(jobId, 'validating', '校验分析证据与报告结构', 94);
    const job = this.jobs.getRecord(jobId);
    if (!job.meta || !job.raw) throw new Error('任务原始数据缺失');
    const partial = job.partialReport;
    const report: AnalysisReport = {
      meta: job.meta,
      summary: partial.summary!,
      topics: partial.topics!,
      sentiment: partial.sentiment!,
      timeline: job.raw.timeline,
      coreFeedbacks: partial.coreFeedbacks!,
      highValueFeedbacks: partial.highValueFeedbacks!,
      suggestions: partial.suggestions!,
      coverage: { ...job.coverage },
      generatedAt: new Date().toISOString(),
    };
    this.jobs.complete(jobId, report);
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
