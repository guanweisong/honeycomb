import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { TagListQuerySchema } from "@honeycomb/validation/tag/schemas/tag.list.query.schema";
import { TagCreateSchema } from "@honeycomb/validation/tag/schemas/tag.create.schema";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { UserLevel } from ".prisma/client";

export const tagRouter = router({
  index: publicProcedure
    .input(TagListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, name, ...rest } = input as any;
      const conditions = Tools.getFindConditionsByQueries(rest, ["status"], {
        name,
      });
      const list = await ctx.prisma.tag.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await ctx.prisma.tag.count({ where: conditions });
      return { list, total };
    }),

  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(TagCreateSchema)
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.tag.create({ data: input });
    }),

  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.tag.deleteMany({ where: { id: { in: input.ids } } });
      return { success: true };
    }),

  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(UpdateSchema(TagUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      return await ctx.prisma.tag.update({ where: { id }, data });
    }),
});
