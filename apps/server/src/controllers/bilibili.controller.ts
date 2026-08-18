import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import type { CommentPage, DanmakuPage, VideoMeta } from '../types';

import { BilibiliService } from '../services/bilibili.service';

/**
 * 原始数据拉取接口：弹幕/评论分页渲染。
 * 与 /api/analysis（完整分析）互补，前端「弹幕」「评论」两个 Tab 使用。
 */
@Controller('bilibili')
export class BilibiliController {
  constructor(private readonly bili: BilibiliService) {}

  /** GET /api/bilibili/:bvid/meta — 视频基础信息。 */
  @Get(':bvid/meta')
  getMeta(@Param('bvid') bvid: string): Promise<VideoMeta> {
    return this.bili.getVideoMeta(this.bili.parseBvid(bvid));
  }

  /** GET /api/bilibili/:bvid/danmaku?start=0 — 一个时间窗（2 分钟）的弹幕。 */
  @Get(':bvid/danmaku')
  async getDanmaku(
    @Param('bvid') bvid: string,
    @Query('start') start?: string,
  ): Promise<DanmakuPage> {
    const meta = await this.bili.getVideoMeta(this.bili.parseBvid(bvid));
    return this.bili.getDanmakuWindow(meta, parseStartMs(start));
  }

  /** GET /api/bilibili/:bvid/comments?mode=3&offset= — 一页评论（游标翻页）。 */
  @Get(':bvid/comments')
  async getComments(
    @Param('bvid') bvid: string,
    @Query('mode') mode?: string,
    @Query('offset') offset?: string,
  ): Promise<CommentPage> {
    const meta = await this.bili.getVideoMeta(this.bili.parseBvid(bvid));
    return this.bili.getCommentPage(meta, {
      mode: mode === '2' ? 2 : 3,
      offset: offset ?? '',
    });
  }
}

function parseStartMs(raw?: string): number {
  const n = Number(raw ?? '0');
  if (!Number.isFinite(n) || n < 0) {
    throw new BadRequestException('start 必须为非负整数（毫秒）');
  }
  return Math.floor(n);
}
