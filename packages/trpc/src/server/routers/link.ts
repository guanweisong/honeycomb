import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { LinkListQuerySchema } from "@honeycomb/validation/link/schemas/link.list.query.schema";
import { LinkCreateSchema } from "@honeycomb/validation/link/schemas/link.create.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { LinkUpdateSchema } from "@honeycomb/validation/link/schemas/link.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq } from "drizzle-orm";

export const linkRouter = router({
  index: publicProcedure
    .input(LinkListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.link, rest, ["status"]);
      const list = await ctx.db.tables.link.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });
      const count = await ctx.db.tables.link.count(undefined, where as any);

      return { list, total: count };
    }),

  create: protectedProcedure(["ADMIN"])
    .input(LinkCreateSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.link.insert(input as any);
      return input;
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.link.deleteByIds(input.ids as string[]);
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN"])
    .input(UpdateSchema(LinkUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.link.update(data as any, { id });
      return { id, ...data };
    }),
});
