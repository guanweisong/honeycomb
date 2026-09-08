import "server-only";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { CategoryListQuerySchema } from "@/features/category/schemas/category.list.query.schema";
import { CategoryInsertSchema } from "@/features/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";
import {
  getCategoryList,
  createCategory,
  destroyCategories,
  updateCategory,
} from "@/features/category/application/category-use-cases";
import { createCategoryRepository } from "@/features/category/infrastructure/category-repository";
import { invalidateAllPublicContent } from "@/packages/infrastructure/refresh-path";

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
    .mutation(async ({ input, ctx }) => {
      const result = await createCategory(
        createCategoryRepository(ctx.db),
        input,
      ).catch(mapApplicationError);
      await invalidateAllPublicContent();
      return result;
    }),
  destroy: permissionProcedure(Permission.categoryDelete)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await destroyCategories(
        createCategoryRepository(ctx.db),
        input.ids,
      );
      await invalidateAllPublicContent();
      return result;
    }),
  update: permissionProcedure(Permission.categoryUpdate)
    .input(CategoryUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateCategory(
        createCategoryRepository(ctx.db),
        input,
      ).catch(mapApplicationError);
      await invalidateAllPublicContent();
      return result;
    }),
});
