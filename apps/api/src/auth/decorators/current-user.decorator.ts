import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { resolveMockUserFromRequestLike } from '../mock-users';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.currentUser ?? resolveMockUserFromRequestLike(request);
});
