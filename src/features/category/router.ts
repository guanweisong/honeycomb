import "server-only";
import {
  getCategoryTree,
  listCategories,
  createCategory,
  destroyCategories,
  updateCategory,
} from "@/features/category/server";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";

import {
  CategoryListQuerySchema,
  CategoryInsertSchema,
  CategoryUpdateSchema,
} from "@/features/category/schema";

import { publicContentInvalidator } from "@/lib/cache/refresh-path";

/** 分类 API 的传输层，只负责输入、权限和业务服务编排。 */
export const categoryRouter = createTRPCRouter({
  tree: publicProcedure.query(({ ctx }) =>
    getCategoryTree(ctx.db, "PUBLIC_ONLY"),
  ),
  adminTree: permissionProcedure(Permission.categoryReadAll).query(({ ctx }) =>
    getCategoryTree(ctx.db, "ALL"),
  ),
  index: publicProcedure
    .input(CategoryListQuerySchema)
    .query(({ input, ctx }) => listCategories(ctx.db, input, "PUBLIC_ONLY")),
  adminIndex: permissionProcedure(Permission.categoryReadAll)
    .input(CategoryListQuerySchema)
    .query(({ input, ctx }) => listCategories(ctx.db, input, "ALL")),
  create: permissionProcedure(Permission.categoryCreate)
    .input(CategoryInsertSchema)
    .mutation(({ input, ctx }) =>
      createCategory(ctx.db, input, publicContentInvalidator).catch(
        mapApplicationError,
      ),
    ),
  destroy: permissionProcedure(Permission.categoryDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) =>
      destroyCategories(ctx.db, input.ids, publicContentInvalidator),
    ),
  update: permissionProcedure(Permission.categoryUpdate)
    .input(CategoryUpdateSchema)
    .mutation(({ input, ctx }) =>
      updateCategory(ctx.db, input, publicContentInvalidator).catch(
        mapApplicationError,
      ),
    ),
});
