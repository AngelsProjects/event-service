import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';

import { v4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { id?: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId =
      (request.headers['x-request-id'] as string | undefined) || v4();

    request.id = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}
