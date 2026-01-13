import {
  protectedProcedure,
  createTRPCRouter,
} from "@/packages/trpc/server/core";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/server/libs/tools";
import { TokenListQuerySchema } from "@/packages/validation/schemas/token/token.list.query.schema";
import * as schema from "@/packages/db/schema";
import { sql } from "drizzle-orm";
import { UserLevel } from "@/packages/types/user/user.level";

/**
 * API Token 相关的 tRPC 路由。
 */
export const tokenRouter = createTRPCRouter({
  /**
   * 查询 Token 列表（支持分页、筛选、排序）。
   * (需要管理员权限)
   * @param {TokenListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含 Token 列表和总记录数的对象。
   */
  index: protectedProcedure([UserLevel.ADMIN])
    .input(TokenListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
      const where = buildDrizzleWhere(schema.token, rest, []);

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.token,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.token)
        .where(where)
        .orderBy(orderByClause)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.token)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),
});
