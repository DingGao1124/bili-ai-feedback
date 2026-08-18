import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BilibiliModule } from './modules/bilibili.module';
import { AnalysisModule } from './modules/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BilibiliModule,
    AnalysisModule,
  ],
})
export class AppModule {}
