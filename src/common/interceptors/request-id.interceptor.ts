import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Wrap logic in an observable that resolves the ESM import dynamically
    return from(import('uuid')).pipe(
      mergeMap(({ v4: uuidv4 }) => {
        const request = context
          .switchToHttp()
          .getRequest<Request & { id?: string }>();
        const response = context.switchToHttp().getResponse<Response>();

        const requestId =
          (request.headers['x-request-id'] as string | undefined) || uuidv4();

        request.id = requestId;
        response.setHeader('X-Request-Id', requestId);

        return next.handle();
      }),
    );
  }
}
