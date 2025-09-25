import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import { buildDrizzleOrderBy } from "@honeycomb/trpc/server/libs/tools";
import { TokenListQuerySchema } from "@honeycomb/validation/token/schemas/token.list.query.schema";
import * as schema from "@honeycomb/db/src/schema";
import { sql } from "drizzle-orm";

export const tokenRouter = router({
  index: protectedProcedure(["ADMIN"])
    .input(TokenListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = rest;

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
        .orderBy(orderByClause as any)
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
