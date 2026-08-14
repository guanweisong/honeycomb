import "server-only";

import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { getStatistics } from "./statistic.service";

/** 统计 API 的传输层，只负责权限和业务服务编排。 */
export const statisticRouter = createTRPCRouter({
  index: permissionProcedure(Permission.statisticsRead).query(({ ctx }) =>
    getStatistics(ctx.db),
  ),
});
