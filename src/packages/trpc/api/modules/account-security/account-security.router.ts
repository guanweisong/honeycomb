import "server-only";

import { Permission } from "@/packages/identity/auth/permissions";
import { listUserLoginHistory } from "@/packages/identity/account-security/server/login-history.repository";
import {
  createTRPCRouter,
  permissionProcedure,
} from "@/packages/trpc/api/core";

export const accountSecurityRouter = createTRPCRouter({
  loginHistory: permissionProcedure(Permission.userReadSelf).query(
    async ({ ctx }) => {
      const history = await listUserLoginHistory(ctx.db, ctx.user.id);

      return history.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }));
    },
  ),
});
