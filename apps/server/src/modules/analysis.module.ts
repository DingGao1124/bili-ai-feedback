import { Module } from '@nestjs/common';

import { BilibiliModule } from './bilibili.module';
import { AnalysisController } from '../controllers/analysis.controller';
import { AnalysisService } from '../services/analysis.service';
import { AnalysisJobStore } from '../services/analysis-job.store';
import { FeedbackProcessorService } from '../services/feedback-processor.service';
import { FeedbackAgentService } from '../services/feedback-agent.service';

@Module({
  imports: [BilibiliModule],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    AnalysisJobStore,
    FeedbackProcessorService,
    FeedbackAgentService,
  ],
})
export class AnalysisModule {}
