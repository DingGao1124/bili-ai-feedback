import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AnalysisEventType,
  AnalysisJobRecord,
  AnalysisJobStatus,
  AnalysisJobView,
  AnalysisReport,
  AnalysisStreamEvent,
  Comment,
  Danmaku,
  RawDataSnapshot,
  VideoMeta,
} from '../types';

const JOB_TTL_MS = 60 * 60 * 1000;
const MAX_JOBS = 20;
const MAX_EVENTS = 2_000;

type EventListener = (event: AnalysisStreamEvent) => void;

@Injectable()
export class AnalysisJobStore {
  private readonly jobs = new Map<string, AnalysisJobRecord>();
  private readonly listeners = new Map<string, Set<EventListener>>();

  create(input: string, bvid: string): AnalysisJobView {
    this.cleanup();
    if (this.jobs.size >= MAX_JOBS) this.evictOldestCompleted();
    if (this.jobs.size >= MAX_JOBS) {
      throw new ServiceUnavailableException('当前分析任务较多，请稍后再试');
    }

    const now = Date.now();
    const job: AnalysisJobRecord = {
      id: randomUUID(),
      input,
      bvid,
      status: 'queued',
      stageLabel: '等待开始',
      progress: 0,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + JOB_TTL_MS).toISOString(),
      coverage: {
        danmakuFetched: 0,
        danmakuTotal: 0,
        commentsFetched: 0,
        commentsTotal: 0,
        semanticDanmaku: 0,
        semanticComments: 0,
      },
      resultReady: false,
      danmaku: [],
      comments: [],
      events: [],
      partialReport: {},
    };
    this.jobs.set(job.id, job);
    this.emit(job.id, 'status', { status: job.status, label: job.stageLabel });
    return this.toView(job);
  }

  getRecord(id: string): AnalysisJobRecord {
    this.cleanup();
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('分析任务不存在或已过期');
    return job;
  }

  getView(id: string): AnalysisJobView {
    return this.toView(this.getRecord(id));
  }

  setStatus(
    id: string,
    status: AnalysisJobStatus,
    stageLabel: string,
    progress: number,
  ): void {
    const job = this.getRecord(id);
    job.status = status;
    job.stageLabel = stageLabel;
    job.progress = Math.max(0, Math.min(100, Math.round(progress)));
    job.error = undefined;
    this.emit(id, 'status', { status, label: stageLabel, progress: job.progress });
  }

  setProgress(id: string, progress: number, detail: string): void {
    const job = this.getRecord(id);
    job.progress = Math.max(job.progress, Math.min(99, Math.round(progress)));
    this.emit(id, 'progress', { progress: job.progress, detail });
  }

  setMeta(id: string, meta: VideoMeta): void {
    const job = this.getRecord(id);
    job.meta = meta;
    job.coverage.danmakuTotal = meta.danmakuCount;
    this.emit(id, 'meta_ready', {});
  }

  setRawData(
    id: string,
    data: { danmaku: Danmaku[]; comments: Comment[]; raw: RawDataSnapshot },
  ): void {
    const job = this.getRecord(id);
    job.danmaku = data.danmaku;
    job.comments = data.comments;
    job.raw = data.raw;
    job.coverage.danmakuFetched = data.danmaku.length;
    job.coverage.commentsFetched = data.comments.length;
  }

  patchCoverage(id: string, values: Partial<AnalysisJobRecord['coverage']>): void {
    Object.assign(this.getRecord(id).coverage, values);
  }

  patchReport(id: string, values: Partial<AnalysisReport>, section: string): void {
    const job = this.getRecord(id);
    Object.assign(job.partialReport, values);
    this.emit(id, 'section_saved', { section });
  }

  complete(id: string, report: AnalysisReport): void {
    const job = this.getRecord(id);
    job.report = report;
    job.partialReport = report;
    job.resultReady = true;
    job.status = 'completed';
    job.stageLabel = '分析完成';
    job.progress = 100;
    this.emit(id, 'completed', { resultReady: true });
  }

  fail(id: string, status: 'fetch_failed' | 'ai_failed', message: string): void {
    const job = this.getRecord(id);
    job.status = status;
    job.stageLabel = status === 'fetch_failed' ? '数据获取失败' : 'AI 分析失败';
    job.error = message;
    job.resultReady = false;
    this.emit(id, 'failed', { status, message });
  }

  resetAi(id: string): void {
    const job = this.getRecord(id);
    if (!job.meta || !job.raw) {
      throw new ServiceUnavailableException('原始数据尚未准备完成，无法重试');
    }
    job.partialReport = {};
    job.report = undefined;
    job.resultReady = false;
    job.error = undefined;
    this.setStatus(id, 'semantic_mapping', '重新整理语义样本', 58);
  }

  getReport(id: string): AnalysisReport | undefined {
    return this.getRecord(id).report;
  }

  emit(id: string, type: AnalysisEventType, data: Record<string, unknown>): void {
    const job = this.getRecord(id);
    const event: AnalysisStreamEvent = {
      jobId: id,
      seq: (job.events.at(-1)?.seq ?? 0) + 1,
      timestamp: new Date().toISOString(),
      type,
      data,
    };
    job.events.push(event);
    if (job.events.length > MAX_EVENTS) job.events.splice(0, job.events.length - MAX_EVENTS);
    for (const listener of this.listeners.get(id) ?? []) listener(event);
  }

  eventsAfter(id: string, seq: number): AnalysisStreamEvent[] {
    return this.getRecord(id).events.filter((event) => event.seq > seq);
  }

  subscribe(id: string, listener: EventListener): () => void {
    this.getRecord(id);
    const listeners = this.listeners.get(id) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(id, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(id);
    };
  }

  getDanmakuPage(
    id: string,
    options: { offset: number; limit: number; query?: string; start?: number; end?: number },
  ): { items: Danmaku[]; total: number } {
    let items = this.getRecord(id).danmaku;
    if (options.query) items = items.filter((item) => item.content.includes(options.query!));
    if (options.start !== undefined) items = items.filter((item) => item.progress >= options.start!);
    if (options.end !== undefined) items = items.filter((item) => item.progress < options.end!);
    return { items: items.slice(options.offset, options.offset + options.limit), total: items.length };
  }

  getCommentPage(
    id: string,
    options: { offset: number; limit: number; query?: string; level?: number },
  ): { items: Comment[]; total: number } {
    let items = this.getRecord(id).comments;
    if (options.query) items = items.filter((item) => item.content.includes(options.query!));
    if (options.level !== undefined) items = items.filter((item) => item.level === options.level);
    return { items: items.slice(options.offset, options.offset + options.limit), total: items.length };
  }

  private toView(job: AnalysisJobRecord): AnalysisJobView {
    return {
      id: job.id,
      input: job.input,
      bvid: job.bvid,
      status: job.status,
      stageLabel: job.stageLabel,
      progress: job.progress,
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
      meta: job.meta,
      coverage: { ...job.coverage },
      raw: job.raw,
      resultReady: job.resultReady,
      error: job.error,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (Date.parse(job.expiresAt) <= now) {
        this.jobs.delete(id);
        this.listeners.delete(id);
      }
    }
  }

  private evictOldestCompleted(): void {
    const candidate = [...this.jobs.values()]
      .filter((job) => job.status === 'completed' || job.status.endsWith('_failed'))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
    if (candidate) {
      this.jobs.delete(candidate.id);
      this.listeners.delete(candidate.id);
    }
  }
}
