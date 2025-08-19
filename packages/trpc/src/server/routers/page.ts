import { protectedProcedure, publicProcedure, router } from "@honeycomb/trpc/server/core";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { PageListQuerySchema } from "@honeycomb/validation/page/schemas/page.list.query.schema";
import { PageCreateSchema } from "@honeycomb/validation/page/schemas/page.create.schema";
import { PageUpdateSchema } from "@honeycomb/validation/page/schemas/page.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { UserLevel } from ".prisma/client";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";

export const pageRouter = router({
  index: publicProcedure
    .input(PageListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, title, content, ...rest } = input as any;
      const conditions = Tools.getFindConditionsByQueries(rest, ["status"], { title, content });
      const list = await ctx.prisma.page.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          author: { select: { id: true, name: true } },
        },
      });
      const total = await ctx.prisma.page.count({ where: conditions });
      return { list, total };
    }),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.prisma.page.findUnique({
        where: { id: input.id },
        include: { author: { select: { id: true, name: true } } },
      });
      return result;
    }),

  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(PageCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      return await ctx.prisma.page.create({ data: { ...input, authorId } as any });
    }),

  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.page.deleteMany({ where: { id: { in: input.ids as string[] } } });
      return { success: true };
    }),

  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(UpdateSchema(PageUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      return await ctx.prisma.page.update({ where: { id }, data });
    }),
});
