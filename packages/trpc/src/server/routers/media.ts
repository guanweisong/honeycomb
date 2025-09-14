import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { MediaListQuerySchema } from "@honeycomb/validation/media/schemas/media.list.query.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import * as schema from "@honeycomb/db/src/schema";

// all queries migrated to proxy, no direct drizzle imports needed here

export const mediaRouter = router({
  index: protectedProcedure(["ADMIN", "EDITOR", "GUEST"])
    .input(MediaListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.media, rest, []);

      const list = await ctx.db.tables.media.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });
      const count = await ctx.db.tables.media.count(undefined, where as any);

      return { list, total: count };
    }),

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.media.deleteByIds(input.ids as string[]);
      return { success: true };
    }),
});
