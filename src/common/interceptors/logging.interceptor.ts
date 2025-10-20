import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { id?: string }>();
    const { method, url, id: requestId } = request;
    const now = Date.now();

    this.logger.log({
      message: 'Incoming request',
      requestId,
      method,
      url,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const duration = Date.now() - now;

          this.logger.log({
            message: 'Request completed',
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - now;
          this.logger.error({
            message: 'Request failed',
            requestId,
            method,
            url,
            error: error.message,
            duration: `${duration}ms`,
          });
        },
      }),
    );
  }
}
