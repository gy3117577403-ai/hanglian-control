import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { resolveMockUserFromRequestLike } from '../mock-users';
import type { Permission } from '../mock-users';
import { AuthService } from '../auth.service';

@Injectable()
export class MockPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = resolveMockUserFromRequestLike(request);
    request.currentUser = user;

    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    if (!required.length) return true;
    const allowed = required.every((permission) => this.authService.hasPermission(user.role, permission));
    if (!allowed) {
      throw new ForbiddenException('当前角色无权执行该操作。');
    }
    return true;
  }
}
