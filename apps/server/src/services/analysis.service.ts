import { Injectable, Logger } from '@nestjs/common';
import type {
  AnalysisResult,
  Comment,
  Danmaku,
  KeyFeedback,
  VideoMeta,
} from '../types';

import { BilibiliService } from './bilibili.service';
import { LlmService } from './llm.service';
import {
  buildTimeline,
  pickKeyFeedbacks,
  sentimentBreakdown,
  topKeywords,
} from '../utils/heuristics';

const SYSTEM_PROMPT = `你是B站创作者的观众反馈分析助手。站在UP主视角，从评论和弹幕里提炼对下一期创作有用的信息。只输出JSON。`;

interface LlmOutput {
  summary: string;
  keyFeedbacks: KeyFeedback[];
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly bili: BilibiliService,
    private readonly llm: LlmService,
  ) {}

  async analyze(input: string): Promise<AnalysisResult> {
    const bvid = this.bili.parseBvid(input);
    const meta = await this.bili.getVideoMeta(bvid);

    // 弹幕和评论并行拉取。
    const [danmaku, comments] = await Promise.all([
      this.bili.getDanmaku(meta),
      this.bili.getComments(meta),
    ]);

    const danmakuTexts = danmaku.map((d) => d.content);
    const commentTexts = comments.map((c) => c.content);
    const allTexts = [...commentTexts, ...danmakuTexts];

    // 确定性部分：热词、情感分布、时间轴曲线。
    const topics = topKeywords(allTexts);
    const sentiment = sentimentBreakdown(allTexts);
    const timeline = buildTimeline(danmaku, meta.duration);

    // 摘要 + 高价值反馈：优先 LLM，失败回退启发式。
    const llmOut = await this.askLlm(meta.title, comments, danmaku);
    const aiGenerated = llmOut !== null;

    return {
      meta,
      summary: llmOut?.summary ?? this.heuristicSummary(meta, comments, danmaku),
      topics,
      sentiment,
      keyFeedbacks: llmOut?.keyFeedbacks ?? pickKeyFeedbacks(comments),
      timeline,
      aiGenerated,
    };
  }

  private async askLlm(
    title: string,
    comments: Comment[],
    danmaku: Danmaku[],
  ): Promise<LlmOutput | null> {
    if (!this.llm.enabled) return null;

    // 控制 token：评论取热度前 60 条，弹幕取前 200 条。
    const topComments = comments
      .slice()
      .sort((a, b) => b.like - a.like)
      .slice(0, 60)
      .map((c) => `[LV${c.level} 赞${c.like}] ${c.content}`);
    const dmSample = danmaku.slice(0, 200).map((d) => d.content);

    const user = `视频标题：${title}

评论（按热度）：
${topComments.join('\n')}

弹幕样本：
${dmSample.join(' / ')}

请返回JSON，字段：
- summary: 两三句话总结观众在讨论什么、整体情绪、以及对下一期最值得注意的点。
- keyFeedbacks: 数组，最多5条最有价值的反馈，每条 {content, source:"comment"|"danmaku", reason, sentiment:"positive"|"neutral"|"negative"}。`;

    return this.llm.completeJson<LlmOutput>(SYSTEM_PROMPT, user);
  }

  private heuristicSummary(
    meta: VideoMeta,
    comments: Comment[],
    danmaku: Danmaku[],
  ): string {
    return `《${meta.title}》分析基于 ${danmaku.length} 条弹幕（当前弹幕池，历史累计 ${meta.danmakuCount.toLocaleString()} 条）与按热度采样的 ${comments.length} 条评论。当前为本地启发式摘要（未配置 LLM），高价值反馈按用户等级与互动量排序。配置 LLM_* 环境变量后可获得 AI 生成的话题总结与改进建议。`;
  }
}
