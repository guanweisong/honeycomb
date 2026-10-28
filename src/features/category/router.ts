import "server-only";
import {
  getCategoryTree,
  listCategories,
} from "@/features/category/server/category-queries";
import {
  createCategory,
  destroyCategories,
  updateCategory,
} from "@/features/category/server/category-commands";

import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/lib/trpc/core";

import { Permission } from "@/lib/auth/permissions";

import { CategoryDeleteSchema } from "@/features/category/schemas/category.delete.schema";
import { CategoryListQuerySchema } from "@/features/category/schemas/category.list.schema";
import { CategoryInsertSchema } from "@/features/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";

import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";

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
      createCategory(ctx.db, input, publicContentInvalidator),
    ),
  destroy: permissionProcedure(Permission.categoryDelete)
    .input(CategoryDeleteSchema)
    .mutation(({ input, ctx }) =>
      destroyCategories(ctx.db, input.ids, publicContentInvalidator),
    ),
  update: permissionProcedure(Permission.categoryUpdate)
    .input(CategoryUpdateSchema)
    .mutation(({ input, ctx }) =>
      updateCategory(ctx.db, input, publicContentInvalidator),
    ),
});
