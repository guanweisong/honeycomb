import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { LinkListQuerySchema } from "@honeycomb/validation/link/schemas/link.list.query.schema";
import { LinkInsertSchema } from "@honeycomb/validation/link/schemas/link.insert.schema";
import { LinkUpdateSchema } from "@honeycomb/validation/link/schemas/link.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";

/**
 * 友情链接相关的 tRPC 路由。
 */
export const linkRouter = router({
  /**
   * 查询友情链接列表（支持分页、筛选、排序）。
   * @param {LinkListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含链接列表和总记录数的对象。
   */
  index: publicProcedure
    .input(LinkListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const searchText = rest.title || rest.description;
      const where = buildDrizzleWhere(
        schema.link,
        { ...rest, title: searchText },
        ["status"],
        { title: searchText },
      );

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.link,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.link)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.link)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  /**
   * 创建一个新的友情链接。
   * (需要管理员权限)
   * @param {LinkInsertSchema} input - 新链接的数据。
   * @returns {Promise<Link>} 返回新创建的链接对象。
   */
  create: protectedProcedure(["ADMIN"])
    .input(LinkInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newLink] = await ctx.db
        .insert(schema.link)
        .values(input as InferInsertModel<typeof schema.link>)
        .returning();
      return newLink;
    }),

  /**
   * 批量删除友情链接。
   * (需要管理员权限)
   * @param {DeleteBatchSchema} input - 包含要删除的链接 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.link)
        .where(inArray(schema.link.id, input.ids));
      return { success: true };
    }),

  /**
   * 更新一个友情链接。
   * (需要管理员权限)
   * @param {LinkUpdateSchema} input - 包含要更新的链接 ID 和新数据。
   * @returns {Promise<Link>} 返回更新后的链接对象。
   */
  update: protectedProcedure(["ADMIN"])
    .input(LinkUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedLink] = await ctx.db
        .update(schema.link)
        .set(rest as Partial<InferInsertModel<typeof schema.link>>)
        .where(eq(schema.link.id, id))
        .returning();
      return updatedLink;
    }),
});
