import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { requestLogger } from './common/request-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 前端本地开发跨域访问；生产同源部署时可收紧。
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.use(requestLogger);

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  Logger.log(`🚀 Server running at http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
