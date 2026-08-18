import { Module } from '@nestjs/common';

import { BilibiliModule } from './bilibili.module';
import { AnalysisController } from '../controllers/analysis.controller';
import { AnalysisService } from '../services/analysis.service';
import { LlmService } from '../services/llm.service';

@Module({
  imports: [BilibiliModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, LlmService],
})
export class AnalysisModule {}
