import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicUser } from '../../users';

export type AuthenticatedRequestUser = PublicUser & {
  tokenPayload?: unknown;
};

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedRequestUser | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedRequestUser }>();
    return request.user;
  },
);
