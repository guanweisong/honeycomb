import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import { buildDrizzleWhere, buildDrizzleOrderBy } from "@honeycomb/trpc/server/libs/tools";
import { MediaListQuerySchema } from "@honeycomb/validation/media/schemas/media.list.query.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

// all queries migrated to proxy, no direct drizzle imports needed here

export const mediaRouter = router({
  index: protectedProcedure(["ADMIN", "EDITOR", "GUEST"])
    .input(MediaListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.media, rest, []);

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.media,
        sortField,
        sortOrder as 'asc' | 'desc',
        'createdAt'
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.media)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(schema.media)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.media)
        .where(inArray(schema.media.id, input.ids as string[]));
      return { success: true };
    }),
});
