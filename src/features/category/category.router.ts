import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { CategoryListQuerySchema } from "@/packages/trpc/api/modules/category/schemas/category.list.query.schema";
import { CategoryInsertSchema } from "@/packages/trpc/api/modules/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@/packages/trpc/api/modules/category/schemas/category.update.schema";
import { getCategoryList, createCategory, destroyCategories, updateCategory } from "@/features/category/service";
import { createCategoryRepository } from "@/features/category/infrastructure/category-repository";

/** 分类 API 的传输层，只负责输入、权限和业务服务编排。 */
export const categoryRouter = createTRPCRouter({
  index: publicProcedure
    .input(CategoryListQuerySchema)
    .query(({ input, ctx }) =>
      getCategoryList(createCategoryRepository(ctx.db), input, "PUBLIC_ONLY"),
    ),
  adminIndex: permissionProcedure(Permission.categoryReadAll)
    .input(CategoryListQuerySchema)
    .query(({ input, ctx }) =>
      getCategoryList(createCategoryRepository(ctx.db), input, "ALL"),
    ),
  create: permissionProcedure(Permission.categoryCreate)
    .input(CategoryInsertSchema)
    .mutation(({ input, ctx }) => createCategory(createCategoryRepository(ctx.db), input)),
  destroy: permissionProcedure(Permission.categoryDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyCategories(createCategoryRepository(ctx.db), input.ids)),
  update: permissionProcedure(Permission.categoryUpdate)
    .input(CategoryUpdateSchema)
    .mutation(({ input, ctx }) => updateCategory(createCategoryRepository(ctx.db), input)),
});
