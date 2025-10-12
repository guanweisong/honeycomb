import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { MediaListQuerySchema } from "@honeycomb/validation/media/schemas/media.list.query.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import * as schema from "@honeycomb/db/src/schema";
import { inArray, sql } from "drizzle-orm";

/**
 * 媒体文件相关的 tRPC 路由。
 */
export const mediaRouter = router({
  /**
   * 查询媒体文件列表（支持分页、筛选、排序）。
   * (需要任意等级的登录权限)
   * @param {MediaListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含媒体文件列表和总记录数的对象。
   */
  index: protectedProcedure(["ADMIN", "EDITOR", "GUEST"])
    .input(MediaListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.media, rest, []);

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.media,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
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
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.media)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  /**
   * 批量删除媒体文件。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的媒体文件 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.media)
        .where(inArray(schema.media.id, input.ids));
      return { success: true };
    }),
});
