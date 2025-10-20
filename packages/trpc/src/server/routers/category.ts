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
import { CategoryListQuerySchema } from "@honeycomb/validation/category/schemas/category.list.query.schema";
import { CategoryInsertSchema } from "@honeycomb/validation/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import * as schema from "@honeycomb/db/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { UserLevel } from "@honeycomb/types/user/user.level";

/**
 * 分类相关的 tRPC 路由。
 */
export const categoryRouter = router({
  /**
   * 查询分类列表（支持分页、筛选、排序和树状结构）。
   * @param {CategoryListQuerySchema} input - 查询参数，包括分页、排序和筛选条件。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含树状结构列表和总记录数的对象。
   *
   * 工作流程：
   * 1. 使用 `buildDrizzleWhere` 根据输入参数动态构建筛选条件。
   * 2. 使用 `buildDrizzleOrderBy` 构建排序条件。
   * 3. 查询分页后的分类列表。
   * 4. 查询满足筛选条件的总记录数。
   * 5. 使用 `Tools.sonsTree` 将扁平的分类列表转换为层级分明的树状结构。
   */
  index: publicProcedure
    .input(CategoryListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { id, page, limit, sortField, sortOrder, title, ...rest } =
        input as any;
      const where = buildDrizzleWhere(
        schema.category,
        { ...rest, title },
        ["status"],
        { title },
      );

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.category,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.category)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.category)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return {
        list: Tools.sonsTree(list, id),
        total,
      };
    }),

  /**
   * 创建一个新分类。
   * (需要管理员或编辑权限)
   * @param {CategoryInsertSchema} input - 新分类的数据。
   * @returns {Promise<Category>} 返回新创建的分类对象。
   */
  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(CategoryInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newCategory] = await ctx.db
        .insert(schema.category)
        .values(input as InferInsertModel<typeof schema.category>)
        .returning();
      return newCategory;
    }),

  /**
   * 批量删除分类。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的分类 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.category)
        .where(inArray(schema.category.id, input.ids as string[]));
      return { success: true };
    }),

  /**
   * 更新一个分类。
   * (需要管理员或编辑权限)
   * @param {CategoryUpdateSchema} input - 包含要更新的分类 ID 和新数据。
   * @returns {Promise<Category>} 返回更新后的分类对象。
   */
  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(CategoryUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedCategory] = await ctx.db
        .update(schema.category)
        .set(rest as Partial<InferInsertModel<typeof schema.category>>)
        .where(eq(schema.category.id, id))
        .returning();
      return updatedCategory;
    }),
});
