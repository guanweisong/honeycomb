import "server-only";

import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { CategoryListQuerySchema } from "@/packages/trpc/api/modules/category/schemas/category.list.query.schema";
import { CategoryInsertSchema } from "@/packages/trpc/api/modules/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@/packages/trpc/api/modules/category/schemas/category.update.schema";
import * as schema from "@/packages/infrastructure/db/schema";
import { eq, inArray, InferInsertModel } from "drizzle-orm";
import { getCategoryList } from "@/packages/trpc/api/modules/category/category.service";
import { ResourceVisibility } from "@/packages/trpc/api/types/resource-visibility";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/**
 * 分类相关的 tRPC 路由。
 */
export const categoryRouter = createTRPCRouter({
  /**
   * 查询分类列表（支持分页、筛选、排序和树状结构）。
   * @param {CategoryListQuerySchema} input - 查询参数，包括分页、排序和筛选条件。
   * @returns {Promise<{ list: object[], total: number }>} 返回一个包含树状结构列表和总记录数的对象。
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
    .query(({ input, ctx }) =>
      getCategoryList(ctx.db, input, ResourceVisibility.PUBLIC_ONLY),
    ),

  adminIndex: permissionProcedure(Permission.categoryReadAll)
    .input(CategoryListQuerySchema)
    .query(({ input, ctx }) =>
      getCategoryList(ctx.db, input, ResourceVisibility.ALL),
    ),

  /**
   * 创建一个新分类。
   * (需要管理员或编辑权限)
   * @param {CategoryInsertSchema} input - 新分类的数据。
   * @returns {Promise<Category>} 返回新创建的分类对象。
   */
  create: permissionProcedure(Permission.categoryCreate)
    .input(CategoryInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [newCategory] = await observeDbOperation(
        "category.create",
        "insert",
        () =>
          ctx.db
            .insert(schema.category)
            .values(input as InferInsertModel<typeof schema.category>)
            .returning(),
      );
      return newCategory;
    }),

  /**
   * 批量删除分类。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的分类 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: permissionProcedure(Permission.categoryDelete)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await observeDbOperation("category.destroy", "delete", () =>
        ctx.db
          .delete(schema.category)
          .where(inArray(schema.category.id, input.ids as string[])),
      );
      return { success: true };
    }),

  /**
   * 更新一个分类。
   * (需要管理员或编辑权限)
   * @param {CategoryUpdateSchema} input - 包含要更新的分类 ID 和新数据。
   * @returns {Promise<Category>} 返回更新后的分类对象。
   */
  update: permissionProcedure(Permission.categoryUpdate)
    .input(CategoryUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedCategory] = await observeDbOperation(
        "category.update",
        "update",
        () =>
          ctx.db
            .update(schema.category)
            .set(rest as Partial<InferInsertModel<typeof schema.category>>)
            .where(eq(schema.category.id, id))
            .returning(),
      );
      return updatedCategory;
    }),
});
