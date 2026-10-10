import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CurrentUserPayload } from '@/common/types/current-user';

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{
      user?: CurrentUserPayload;
    }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
