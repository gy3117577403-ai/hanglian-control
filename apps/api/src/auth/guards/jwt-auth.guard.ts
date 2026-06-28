import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UsersService, toPublicUser } from '../../users';
import type { AuthenticatedRequestUser } from '../decorators/current-user.decorator';
import { findMockUser, userIdFromToken } from '../mock-users';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      query?: { accessToken?: string | string[] };
      user?: AuthenticatedRequestUser;
    }>();
    const token = this.extractBearerToken(
      request.headers.authorization,
      request.query?.accessToken,
    );
    const mockUser = this.resolveMockJwtUser(token);
    if (mockUser) {
      request.user = mockUser;
      return true;
    }

    const payload = await this.authService.verifyAccessToken(token);
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User is not active.');
    }

    request.user = {
      ...toPublicUser(user),
      tokenPayload: payload,
    };
    return true;
  }

  private extractBearerToken(
    authorization?: string,
    queryAccessToken?: string | string[],
  ) {
    const [type, token] = authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) return token;

    const queryToken = Array.isArray(queryAccessToken)
      ? queryAccessToken[0]
      : queryAccessToken;
    if (queryToken) return queryToken;

    if (!token) {
      throw new UnauthorizedException('Bearer token is required.');
    }
    throw new UnauthorizedException('Bearer token is required.');
  }

  private resolveMockJwtUser(token: string): AuthenticatedRequestUser | undefined {
    const dataSource = process.env.DATA_SOURCE?.trim().toLowerCase() || 'mock';
    if (dataSource !== 'mock') return undefined;

    const mockUser = findMockUser(userIdFromToken(token));
    if (!mockUser) return undefined;

    return {
      id: mockUser.userId,
      username: mockUser.userId,
      displayName: mockUser.name,
      role: mockUser.role,
      teamName: mockUser.team,
      isActive: true,
      tokenPayload: {
        sub: mockUser.userId,
        username: mockUser.userId,
        type: 'mock-access',
      },
    };
  }
}
