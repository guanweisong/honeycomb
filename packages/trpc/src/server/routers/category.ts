import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import Tools, { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { CategoryListQuerySchema } from "@honeycomb/validation/category/schemas/category.list.query.schema";
import { CategoryCreateSchema } from "@honeycomb/validation/category/schemas/category.create.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import * as schema from "@honeycomb/db/src/schema";

export const categoryRouter = router({
  index: publicProcedure
    .input(CategoryListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { id, page, limit, sortField, sortOrder, title, ...rest } =
        input as any;
      const where = buildDrizzleWhere(
        schema.category,
        { ...rest, title },
        ["status"],
        { title },
      );
      const list = await ctx.db.tables.category.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });
      const count = await ctx.db.tables.category.count(undefined, where as any);

      return {
        list: Tools.sonsTree(list, id),
        total: count,
      };
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
    .input(CategoryCreateSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.category.insert(input as any);
      return input;
    }),

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.category.deleteByIds(input.ids as string[]);
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(UpdateSchema(CategoryUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.category.update(data as any, { id });
      return { id, ...data };
    }),
});
