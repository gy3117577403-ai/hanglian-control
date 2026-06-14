import { Injectable, NotFoundException } from '@nestjs/common';
import {
  allPermissions,
  findMockUser,
  mockUsers,
  permissionsForRole,
  resolveMockUserFromRequestLike,
  rolePermissions,
  tokenForUser,
} from './mock-users';
import type { MockRole, MockSession, Permission } from './mock-users';

@Injectable()
export class AuthService {
  getMockUsers() {
    return mockUsers.map((user) => ({
      ...user,
      permissions: permissionsForRole(user.role),
    }));
  }

  mockLogin(userId: string): MockSession {
    const user = findMockUser(userId);
    if (!user) throw new NotFoundException('未找到 Mock 用户。');
    return {
      token: tokenForUser(user),
      user,
      permissions: permissionsForRole(user.role),
    };
  }

  me(request: unknown): MockSession {
    const user = resolveMockUserFromRequestLike(request as Parameters<typeof resolveMockUserFromRequestLike>[0]);
    return {
      token: tokenForUser(user),
      user,
      permissions: permissionsForRole(user.role),
    };
  }

  permissions() {
    return {
      mode: 'mock',
      provider: 'local_mock',
      allPermissions,
      rolePermissions,
    };
  }

  hasPermission(role: MockRole, required: Permission) {
    const permissions = permissionsForRole(role);
    return permissions.includes('admin.all') || permissions.includes(required);
  }
}
