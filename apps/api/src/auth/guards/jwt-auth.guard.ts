import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UsersService, toPublicUser } from '../../users';
import type { AuthenticatedRequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthenticatedRequestUser;
    }>();
    const token = this.extractBearerToken(request.headers.authorization);
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

  private extractBearerToken(authorization?: string) {
    const [type, token] = authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer token is required.');
    }
    return token;
  }
}
