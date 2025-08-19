import { protectedProcedure, publicProcedure, router } from "@honeycomb/trpc/server/core";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { CategoryListQuerySchema } from "@honeycomb/validation/category/schemas/category.list.query.schema";
import { CategoryCreateSchema } from "@honeycomb/validation/category/schemas/category.create.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { UserLevel } from ".prisma/client";

export const categoryRouter = router({
  index: publicProcedure
    .input(CategoryListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { id, page, limit, sortField, sortOrder, title, ...rest } = input as any;
      const conditions = Tools.getFindConditionsByQueries(rest, ["status"], { title });
      const list = await ctx.prisma.category.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await ctx.prisma.category.count({ where: conditions });
      return { list: Tools.sonsTree(list, id as string | undefined), total };
    }),

  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(CategoryCreateSchema)
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.category.create({ data: input });
    }),

  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.category.deleteMany({ where: { id: { in: input.ids as string[] } } });
      return { success: true };
    }),

  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(UpdateSchema(CategoryUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      return await ctx.prisma.category.update({ where: { id }, data });
    }),
});
