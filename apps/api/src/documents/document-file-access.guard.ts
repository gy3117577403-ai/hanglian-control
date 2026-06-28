import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class DocumentFileAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expectedToken = process.env.DOCUMENT_FILE_ACCESS_TOKEN || process.env.FILE_ACCESS_TOKEN;
    if (!expectedToken) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    if (request.user) return true;

    const bearerToken = this.bearerToken(request.headers.authorization);
    const headerToken = request.headers['x-document-file-token'];
    const providedToken = bearerToken || (Array.isArray(headerToken) ? headerToken[0] : headerToken);

    if (providedToken === expectedToken) return true;
    throw new UnauthorizedException('Document file access token is required.');
  }

  private bearerToken(value?: string) {
    const match = value?.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
  }
}
