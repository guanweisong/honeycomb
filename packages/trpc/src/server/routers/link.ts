import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { LinkListQuerySchema } from "@honeycomb/validation/link/schemas/link.list.query.schema";
import { LinkCreateSchema } from "@honeycomb/validation/link/schemas/link.create.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { UserLevel } from ".prisma/client";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { LinkUpdateSchema } from "@honeycomb/validation/link/schemas/link.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";

export const linkRouter = router({
  index: publicProcedure
    .input(LinkListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input;
      const conditions = Tools.getFindConditionsByQueries(rest, ["status"]);
      const list = await ctx.prisma.link.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await ctx.prisma.link.count({ where: conditions });
      return { list, total };
    }),

  create: protectedProcedure([UserLevel.ADMIN])
    .input(LinkCreateSchema)
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.link.create({ data: input });
    }),

  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.link.deleteMany({
        where: { id: { in: input.ids } },
      });
      return { success: true };
    }),

  update: protectedProcedure([UserLevel.ADMIN])
    .input(UpdateSchema(LinkUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      return await ctx.prisma.link.update({ where: { id }, data });
    }),
});
