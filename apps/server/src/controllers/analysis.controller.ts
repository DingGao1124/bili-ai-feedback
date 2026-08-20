import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AnalysisStreamEvent } from '../types';
import { AnalysisService } from '../services/analysis.service';
import { AnalysisJobStore } from '../services/analysis-job.store';
import { AnalyzeDto } from './dto';

@Controller('analysis/jobs')
export class AnalysisController {
  constructor(
    private readonly analysis: AnalysisService,
    private readonly jobs: AnalysisJobStore,
  ) {}

  @Post()
  @HttpCode(202)
  create(@Body() dto: AnalyzeDto) {
    return this.analysis.create(dto.input);
  }

  @Get(':jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.jobs.getView(jobId);
  }

  @Get(':jobId/events')
  events(
    @Param('jobId') jobId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('after') after?: string,
  ): void {
    const headerSeq = Number(req.headers['last-event-id'] ?? 0);
    const querySeq = Number(after ?? 0);
    const lastSeq = Math.max(
      Number.isFinite(headerSeq) ? headerSeq : 0,
      Number.isFinite(querySeq) ? querySeq : 0,
    );

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const write = (event: AnalysisStreamEvent) => {
      res.write(`id: ${event.seq}\n`);
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    for (const event of this.jobs.eventsAfter(jobId, lastSeq)) write(event);

    let unsubscribe: () => void = () => undefined;
    const close = () => {
      clearInterval(heartbeat);
      unsubscribe();
      if (!res.writableEnded) res.end();
    };
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15_000);
    unsubscribe = this.jobs.subscribe(jobId, (event) => {
      write(event);
      if (event.type === 'completed' || event.type === 'failed') close();
    });
    req.on('close', close);

    const status = this.jobs.getView(jobId).status;
    if (status === 'completed' || status.endsWith('_failed')) close();
  }

  @Get(':jobId/events/history')
  eventHistory(
    @Param('jobId') jobId: string,
    @Query('after', new ParseIntPipe({ optional: true })) after = 0,
  ): AnalysisStreamEvent[] {
    return this.jobs.eventsAfter(jobId, Math.max(0, after));
  }

  @Get(':jobId/raw/danmaku')
  getDanmaku(
    @Param('jobId') jobId: string,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('query') query?: string,
    @Query('start', new ParseIntPipe({ optional: true })) start?: number,
    @Query('end', new ParseIntPipe({ optional: true })) end?: number,
  ) {
    return this.jobs.getDanmakuPage(jobId, {
      offset: Math.max(0, offset),
      limit: Math.min(100, Math.max(1, limit)),
      query: query?.trim() || undefined,
      start,
      end,
    });
  }

  @Get(':jobId/raw/comments')
  getComments(
    @Param('jobId') jobId: string,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 30,
    @Query('query') query?: string,
    @Query('level', new ParseIntPipe({ optional: true })) level?: number,
  ) {
    return this.jobs.getCommentPage(jobId, {
      offset: Math.max(0, offset),
      limit: Math.min(100, Math.max(1, limit)),
      query: query?.trim() || undefined,
      level,
    });
  }

  @Get(':jobId/report')
  getReport(@Param('jobId') jobId: string) {
    const report = this.jobs.getReport(jobId);
    if (!report) throw new ConflictException('分析报告尚未生成');
    return report;
  }

  @Post(':jobId/retry')
  @HttpCode(202)
  retry(@Param('jobId') jobId: string) {
    return this.analysis.retry(jobId);
  }
}
