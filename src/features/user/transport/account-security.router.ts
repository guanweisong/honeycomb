import "server-only";

import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { getLoginHistory } from "@/features/user/user.service";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";
import { toLoginHistoryPort } from "@/features/user/infrastructure/user-repository-adapter";

/** 账号安全 API 的传输层，只负责权限和业务服务编排。 */
export const accountSecurityRouter = createTRPCRouter({
  loginHistory: permissionProcedure(Permission.userReadSelf).query(({ ctx }) =>
    getLoginHistory(toLoginHistoryPort(createUserRepository(ctx.db)), ctx.user.id),
  ),
});
