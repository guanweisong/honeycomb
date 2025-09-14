import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { UserListQuerySchema } from "@honeycomb/validation/user/schemas/user.list.query.schema";
import { UserCreateSchema } from "@honeycomb/validation/user/schemas/user.create.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { UserUpdateSchema } from "@honeycomb/validation/user/schemas/user.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import * as schema from "@honeycomb/db/src/schema";

export const userRouter = router({
  index: publicProcedure
    .input(UserListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.user, rest, ["status", "level"]);

      const list = await ctx.db.tables.user.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });
      const count = await ctx.db.tables.user.count(undefined, where as any);

      return { list, total: count };
    }),

  create: protectedProcedure(["ADMIN"])
    .input(UserCreateSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.user.insert(input as any);
      return input;
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.user.deleteByIds(input.ids as string[]);
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN"])
    .input(UpdateSchema(UserUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.user.update(data as any, { id });
      return { id, ...data };
    }),
});
