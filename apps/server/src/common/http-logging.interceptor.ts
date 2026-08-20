import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SENSITIVE_KEY = /cookie|authorization|api[-_]?key|token|secret|password/i;
const MAX_LOG_LENGTH = 4_000;

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();
    const requestPayload = this.serialize({
      params: request.params,
      query: request.query,
      body: request.body,
    });

    return next.handle().pipe(
      tap({
        next: (body) => {
          const payload = request.path.endsWith('/events')
            ? '[SSE stream opened]'
            : this.serialize(body);
          this.write(
            response.statusCode,
            `${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms req=${requestPayload} res=${payload}`,
          );
        },
        error: (error) => {
          const status = Number(error?.status ?? error?.statusCode ?? 500);
          this.write(
            status,
            `${request.method} ${request.originalUrl} ${status} ${Date.now() - startedAt}ms req=${requestPayload} error=${this.serialize(error?.message ?? error)}`,
          );
        },
      }),
    );
  }

  private write(status: number, message: string): void {
    if (status >= 500) this.logger.error(message);
    else if (status >= 400) this.logger.warn(message);
    else this.logger.log(message);
  }

  private serialize(value: unknown): string {
    const seen = new WeakSet<object>();
    try {
      const text = JSON.stringify(value, (key, nested) => {
        if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
        if (typeof nested !== 'object' || nested === null) return nested;
        if (seen.has(nested)) return '[Circular]';
        seen.add(nested);
        if (Array.isArray(nested) && nested.length > 20) {
          return [...nested.slice(0, 20), `[+${nested.length - 20} items]`];
        }
        return nested;
      });
      return text.length > MAX_LOG_LENGTH ? `${text.slice(0, MAX_LOG_LENGTH)}…` : text;
    } catch {
      return '[Unserializable]';
    }
  }
}
