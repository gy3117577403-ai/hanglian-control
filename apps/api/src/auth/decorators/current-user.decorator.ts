import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicUser } from '../../users';
import { resolveMockUserFromRequestLike } from '../mock-users';

export type AuthenticatedRequestUser = PublicUser & {
  tokenPayload?: unknown;
};

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedRequestUser | ReturnType<
    typeof resolveMockUserFromRequestLike
  > => {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedRequestUser;
      currentUser?: ReturnType<typeof resolveMockUserFromRequestLike>;
    }>();
    return (
      request.user ??
      request.currentUser ??
      resolveMockUserFromRequestLike(request)
    );
  },
);
