import { Body, Controller, Post } from '@nestjs/common';
import type { AnalysisResult } from '../types';

import { AnalysisService } from '../services/analysis.service';
import { AnalyzeDto } from './dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  /** POST /api/analysis — 输入 BV 号或视频链接，返回完整分析结果。 */
  @Post()
  analyze(@Body() dto: AnalyzeDto): Promise<AnalysisResult> {
    return this.analysis.analyze(dto.input);
  }
}
