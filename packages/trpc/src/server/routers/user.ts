import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { UserListQuerySchema } from "@honeycomb/validation/user/schemas/user.list.query.schema";
import { UserCreateSchema } from "@honeycomb/validation/user/schemas/user.create.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { UserLevel } from ".prisma/client";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { UserUpdateSchema } from "@honeycomb/validation/user/schemas/user.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";

export const userRouter = router({
  index: publicProcedure
    .input(UserListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input;
      const conditions = Tools.getFindConditionsByQueries(rest, [
        "status",
        "level",
      ]);
      const list = await ctx.prisma.user.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await ctx.prisma.user.count({ where: conditions });
      return { list, total };
    }),

  create: protectedProcedure([UserLevel.ADMIN])
    .input(UserCreateSchema)
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.user.create({ data: input });
    }),

  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.user.deleteMany({
        where: { id: { in: input.ids } },
      });
      return { success: true };
    }),

  update: protectedProcedure([UserLevel.ADMIN])
    .input(UpdateSchema(UserUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      return await ctx.prisma.user.update({ where: { id }, data });
    }),
});

