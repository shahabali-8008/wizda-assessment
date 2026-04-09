import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.constants';

const HEADER = 'x-api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    /** Static dev UI (same origin as GraphQL); no secrets in HTML/JS. */
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest<Request>();
      if (req.method === 'GET' && this.isDevUiPublicPath(req.path)) {
        return true;
      }
    }

    const required = this.config.get<string>('API_KEY');
    if (!required?.trim()) {
      return true;
    }

    const req = this.getRequest(context);
    const provided = this.extractKey(req);
    if (provided === required) {
      return true;
    }

    throw new UnauthorizedException('Invalid or missing API key');
  }

  private getRequest(context: ExecutionContext): Request {
    const type = context.getType<string>();
    if (type === 'graphql') {
      const gql = GqlExecutionContext.create(context);
      return gql.getContext<{ req: Request }>().req;
    }
    return context.switchToHttp().getRequest<Request>();
  }

  private isDevUiPublicPath(path: string): boolean {
    if (path === '/' || path === '/index.html') {
      return true;
    }
    return path === '/app.js' || path === '/styles.css';
  }

  private extractKey(req: Request): string | undefined {
    const header = req.headers[HEADER];
    if (typeof header === 'string') {
      return header;
    }
    if (Array.isArray(header)) {
      return header[0];
    }
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice('Bearer '.length);
    }
    return undefined;
  }
}
