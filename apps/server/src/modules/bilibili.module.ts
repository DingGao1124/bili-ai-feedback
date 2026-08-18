import { Module } from '@nestjs/common';
import { BilibiliService } from '../services/bilibili.service';
import { BilibiliController } from '../controllers/bilibili.controller';

@Module({
  controllers: [BilibiliController],
  providers: [BilibiliService],
  exports: [BilibiliService],
})
export class BilibiliModule {}
