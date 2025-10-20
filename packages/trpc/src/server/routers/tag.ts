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
import { TagListQuerySchema } from "@honeycomb/validation/tag/schemas/tag.list.query.schema";
import { TagInsertSchema } from "@honeycomb/validation/tag/schemas/tag.insert.schema";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import { UserLevel } from "@honeycomb/types/user/user.level";

/**
 * 标签相关的 tRPC 路由。
 */
export const tagRouter = router({
  /**
   * 查询标签列表（支持分页、筛选、排序）。
   * @param {TagListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含标签列表和总记录数的对象。
   */
  index: publicProcedure
    .input(TagListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, name, ...rest } = input as any;
      const where = buildDrizzleWhere(
        schema.tag,
        { ...rest, name },
        ["status"],
        { name },
      );
      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.tag,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.tag)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.tag)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  /**
   * 创建一个新标签。
   * (需要管理员或编辑权限)
   * @param {TagInsertSchema} input - 新标签的数据。
   * @returns {Promise<Tag>} 返回新创建的标签对象。
   */
  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(TagInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newTag] = await ctx.db
        .insert(schema.tag)
        .values(input as InferInsertModel<typeof schema.tag>)
        .returning();
      return newTag;
    }),

  /**
   * 批量删除标签。
   * (需要管理员权限)
   * @param {DeleteBatchSchema} input - 包含要删除的标签 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(schema.tag).where(inArray(schema.tag.id, input.ids));
      return { success: true };
    }),

  /**
   * 更新一个标签。
   * (需要管理员或编辑权限)
   * @param {TagUpdateSchema} input - 包含要更新的标签 ID 和新数据。
   * @returns {Promise<Tag>} 返回更新后的标签对象。
   */
  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(TagUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedTag] = await ctx.db
        .update(schema.tag)
        .set(rest as Partial<InferInsertModel<typeof schema.tag>>)
        .where(eq(schema.tag.id, id))
        .returning();
      return updatedTag;
    }),
});
