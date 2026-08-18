import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * 基础请求日志：方法 + 路径 + 状态码 + 耗时（毫秒）。
 * 状态码 >=500 用 error、>=400 用 warn，其余用 log 输出。
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'log';
    Logger[level](
      `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
      'HTTP',
    );
  });

  next();
}
