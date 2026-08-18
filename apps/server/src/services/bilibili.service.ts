import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import protobuf from 'protobufjs';
import type {
  Comment,
  CommentPage,
  Danmaku,
  DanmakuPage,
  VideoMeta,
} from '../types';

import { buildSignedQuery, getMixinKey } from '../utils/wbi';

// 弹幕分片 protobuf schema，迁移自根目录 CLI。
const DM_PROTO = `
syntax = "proto3";
message DmSegMobileReply { repeated DanmakuElem elems = 1; }
message DanmakuElem {
  int64 id = 1;
  int32 progress = 2;
  int32 mode = 3;
  int32 fontsize = 4;
  uint32 color = 5;
  string midHash = 6;
  string content = 7;
  int64 ctime = 8;
  int32 weight = 9;
  string action = 10;
  int32 pool = 11;
  string idStr = 12;
  int32 attr = 13;
}
`;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

// 弹幕时间窗：与 B 站 web 播放器一致，每 2 分钟一页；每 6 分钟对应一个 segment_index。
const DANMAKU_WINDOW_MS = 120_000;
const DANMAKU_SEGMENT_MS = 360_000;
// 单个窗口请求返回条数达到该阈值时，服务端可能已截断，需二分窗口继续拉取。
const DANMAKU_TRUNCATE_THRESHOLD = 2000;
// 二分细分的最小窗口（毫秒），避免极端密度下无限递归。
const DANMAKU_MIN_SPLIT_MS = 10_000;

@Injectable()
export class BilibiliService {
  private readonly logger = new Logger(BilibiliService.name);
  private readonly cookie = process.env.BILI_COOKIE ?? '';
  private readonly reply = protobuf
    .parse(DM_PROTO)
    .root.lookupType('DmSegMobileReply');

  private headers(referer = 'https://www.bilibili.com'): Record<string, string> {
    const h: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      'user-agent': UA,
      referer,
      origin: 'https://www.bilibili.com',
    };
    if (this.cookie) h.cookie = this.cookie;
    return h;
  }

  /** 从视频链接或 BV 号里抽出 BV 号。 */
  parseBvid(input: string): string {
    const m = input.match(/BV[0-9A-Za-z]{10}/);
    if (!m) {
      throw new BadRequestException('无法从输入中识别 BV 号');
    }
    return m[0];
  }

  private async fetchJson<T>(url: string, referer?: string): Promise<T> {
    const res = await fetch(url, { headers: this.headers(referer) });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return (await res.json()) as T;
  }

  /** 拉取视频基础信息（aid / cid / 标题 / 封面 / 统计）。 */
  async getVideoMeta(bvid: string): Promise<VideoMeta> {
    const info = await this.fetchJson<{
      code: number;
      message: string;
      data: {
        aid: number;
        cid: number;
        title: string;
        pic: string;
        duration: number;
        owner: { name: string };
        stat: { view: number; danmaku: number };
      };
    }>(
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
    );
    if (info.code !== 0) {
      throw new BadRequestException(`获取视频信息失败: ${info.message}`);
    }
    const d = info.data;
    return {
      bvid,
      aid: d.aid,
      cid: d.cid,
      title: d.title,
      cover: d.pic,
      author: d.owner.name,
      view: d.stat.view,
      danmakuCount: d.stat.danmaku,
      duration: d.duration,
    };
  }

  private async getWbiMixinKey(): Promise<string> {
    const nav = await this.fetchJson<{
      code: number;
      data: { wbi_img: { img_url: string; sub_url: string } };
    }>('https://api.bilibili.com/x/web-interface/nav');
    const img = nav.data.wbi_img.img_url.split('/').pop()?.split('.')[0];
    const sub = nav.data.wbi_img.sub_url.split('/').pop()?.split('.')[0];
    if (!img || !sub) throw new Error('nav 返回的 wbi_img 无效');
    return getMixinKey(img + sub);
  }

  /** 获取 WBI mixin key，失败返回 null（调用方据此回退或报错）。 */
  private async resolveMixinKey(): Promise<string | null> {
    try {
      return await this.getWbiMixinKey();
    } catch (err) {
      this.logger.warn(`WBI key 获取失败: ${String(err)}`);
      return null;
    }
  }

  /**
   * 拉取全部弹幕。按 2 分钟时间窗覆盖视频时长；
   * 窗口内返回条数达到截断阈值时，二分细分窗口继续拉，直到取全该窗口。
   */
  async getDanmaku(meta: VideoMeta): Promise<Danmaku[]> {
    const mixinKey = await this.resolveMixinKey();
    const durationMs = meta.duration * 1000;
    const all: Danmaku[] = [];
    await this.collectDanmaku(meta, 0, durationMs, mixinKey, all);
    return all;
  }

  /**
   * 递归拉取 [start, end) 窗口内的全部弹幕。
   * 返回条数达到截断阈值且窗口仍可细分时，二分后分别拉取。
   */
  private async collectDanmaku(
    meta: VideoMeta,
    start: number,
    end: number,
    mixinKey: string | null,
    out: Danmaku[],
  ): Promise<void> {
    if (start >= end) return;
    const buf = await this.fetchDanmakuSegment(meta, start, end, mixinKey);
    if (!buf) return;
    const items = this.decodeDanmaku(buf);
    if (
      items.length >= DANMAKU_TRUNCATE_THRESHOLD &&
      end - start > DANMAKU_MIN_SPLIT_MS
    ) {
      const mid = Math.floor((start + end) / 2);
      await this.collectDanmaku(meta, start, mid, mixinKey, out);
      await this.collectDanmaku(meta, mid, end, mixinKey, out);
      return;
    }
    out.push(...items);
  }

  /** 拉取一个时间窗的弹幕（窗口内细分拉全），供前端分页渲染。 */
  async getDanmakuWindow(meta: VideoMeta, startMs = 0): Promise<DanmakuPage> {
    const durationMs = meta.duration * 1000;
    const start =
      Math.max(0, Math.floor(startMs / DANMAKU_WINDOW_MS) * DANMAKU_WINDOW_MS);
    const end = Math.min(start + DANMAKU_WINDOW_MS, durationMs);
    if (start >= durationMs) {
      return { items: [], start, end: durationMs, hasMore: false };
    }
    const mixinKey = await this.resolveMixinKey();
    const items: Danmaku[] = [];
    await this.collectDanmaku(meta, start, end, mixinKey, items);
    return { items, start, end, hasMore: end < durationMs };
  }

  /**
   * 拉取 [start, end) 时间窗的弹幕原始 protobuf。
   * segment_index 由窗口起点换算，ps/pe 为绝对毫秒。
   */
  private async fetchDanmakuSegment(
    meta: VideoMeta,
    start: number,
    end: number,
    mixinKey: string | null,
  ): Promise<Uint8Array | null> {
    const referer = `https://www.bilibili.com/video/${meta.bvid}/`;
    const seg = Math.floor(start / DANMAKU_SEGMENT_MS) + 1;
    const urls: string[] = [];
    if (mixinKey) {
      const query = buildSignedQuery(
        {
          type: 1,
          oid: meta.cid,
          pid: meta.aid,
          segment_index: seg,
          pull_mode: 1,
          ps: start,
          pe: end,
          web_location: 1315873,
        },
        mixinKey,
      );
      urls.push(`https://api.bilibili.com/x/v2/dm/wbi/web/seg.so?${query}`);
    }
    // legacy 端点不支持 ps/pe，仅作 WBI 失败时的兜底（大分片可能被截断）。
    urls.push(
      `https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=${meta.cid}&segment_index=${seg}`,
    );

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: this.headers(referer) });
        if (!res.ok) continue;
        return new Uint8Array(await res.arrayBuffer());
      } catch (err) {
        this.logger.warn(`弹幕窗口 ${start} 拉取失败: ${String(err)}`);
      }
    }
    return null;
  }

  private decodeDanmaku(buf: Uint8Array): Danmaku[] {
    const decoded = this.reply.decode(buf);
    const obj = this.reply.toObject(decoded, { longs: String }) as {
      elems?: Record<string, unknown>[];
    };
    return (obj.elems ?? []).map(toDanmaku);
  }

  /** 拉取一页评论（游标翻页）。mode=3 热门，mode=2 按时间。 */
  async getCommentPage(
    meta: VideoMeta,
    opts: { mode?: number; offset?: string } = {},
  ): Promise<CommentPage> {
    const mixinKey = await this.resolveMixinKey();
    if (!mixinKey) {
      throw new BadRequestException('无法获取 WBI 签名，评论拉取失败');
    }
    const referer = `https://www.bilibili.com/video/${meta.bvid}/`;
    const url = this.buildCommentUrl(
      meta.aid,
      opts.mode === 2 ? 2 : 3,
      opts.offset ?? '',
      mixinKey,
    );
    const data = await this.fetchJson<CommentApiResponse>(url, referer);
    if (data.code !== 0) {
      throw new BadRequestException(`获取评论失败: ${data.message ?? data.code}`);
    }
    const replies = data.data?.replies ?? [];
    const cursor = data.data?.cursor;
    const nextOffset = cursor?.pagination_reply?.next_offset ?? '';
    const isEnd = cursor?.is_end ?? true;
    return {
      items: replies.map(toComment),
      nextOffset: isEnd ? '' : nextOffset,
      isEnd,
      allCount: cursor?.all_count ?? 0,
    };
  }

  /** 拉取评论（供分析用），按热度最多翻 maxPages 页（每页约 20 条）。 */
  async getComments(meta: VideoMeta, maxPages = 50): Promise<Comment[]> {
    const out: Comment[] = [];
    let offset = '';
    for (let page = 1; page <= maxPages; page += 1) {
      let data: CommentPage;
      try {
        data = await this.getCommentPage(meta, { mode: 3, offset });
      } catch (err) {
        this.logger.warn(`评论第 ${page} 页拉取失败: ${String(err)}`);
        break;
      }
      if (data.items.length === 0) break;
      out.push(...data.items);
      if (data.isEnd || !data.nextOffset) break;
      offset = data.nextOffset;
    }
    return out;
  }

  private buildCommentUrl(
    aid: number,
    mode: number,
    offset: string,
    mixinKey: string,
  ): string {
    // type=1 视频评论；pagination_str 为游标 JSON。
    const params: Record<string, string | number> = {
      oid: aid,
      type: 1,
      mode,
      pagination_str: JSON.stringify({ offset }),
      plat: 1,
      seek_rpid: '',
      web_location: 1315875,
    };
    const query = buildSignedQuery(params, mixinKey);
    return `https://api.bilibili.com/x/v2/reply/wbi/main?${query}`;
  }
}

interface CommentApiResponse {
  code: number;
  message?: string;
  data?: {
    replies?: RawReply[];
    cursor?: {
      is_end?: boolean;
      all_count?: number;
      pagination_reply?: { next_offset?: string };
    };
  };
}

interface RawReply {
  rpid_str: string;
  member: {
    uname: string;
    avatar?: string;
    level_info?: { current_level: number };
  };
  content: { message: string };
  like: number;
  rcount: number;
  ctime: number;
}

function toComment(r: RawReply): Comment {
  return {
    rpid: r.rpid_str,
    uname: r.member?.uname ?? '',
    avatar: r.member?.avatar ?? '',
    level: r.member?.level_info?.current_level ?? 0,
    content: r.content?.message ?? '',
    like: r.like ?? 0,
    replyCount: r.rcount ?? 0,
    ctime: r.ctime ?? 0,
  };
}

function toDanmaku(raw: Record<string, unknown>): Danmaku {
  return {
    id: String(raw.id ?? ''),
    progress: Number(raw.progress ?? 0),
    mode: Number(raw.mode ?? 0),
    fontsize: Number(raw.fontsize ?? 0),
    color: Number(raw.color ?? 16777215),
    content: String(raw.content ?? ''),
    ctime: String(raw.ctime ?? ''),
    weight: Number(raw.weight ?? 0),
    pool: Number(raw.pool ?? 0),
    attr: Number(raw.attr ?? 0),
  };
}
