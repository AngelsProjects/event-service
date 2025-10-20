import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ErrorCode } from '../types/error-codes.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authorization header is required',
        },
      });
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid authorization format. Expected: Bearer <token>',
        },
      });
    }

    const validToken = this.configService.get<string>('ADMIN_TOKEN');

    if (token !== validToken) {
      throw new UnauthorizedException({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid authentication token',
        },
      });
    }

    return true;
  }
}
