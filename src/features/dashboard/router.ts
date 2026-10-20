import "server-only";
import { getStatistics } from "@/features/dashboard/server";

import { Permission } from "@/lib/auth/permissions";
import { permissionProcedure, createTRPCRouter } from "@/lib/trpc/core";

/** 统计 API 的传输层，只负责权限和业务服务编排。 */
export const statisticRouter = createTRPCRouter({
  index: permissionProcedure(Permission.statisticsRead).query(({ ctx }) =>
    getStatistics(ctx.db),
  ),
});
