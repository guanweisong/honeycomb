import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { TagListQuerySchema } from "@honeycomb/validation/tag/schemas/tag.list.query.schema";
import { TagCreateSchema } from "@honeycomb/validation/tag/schemas/tag.create.schema";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { inArray } from "drizzle-orm";

export const tagRouter = router({
  index: publicProcedure
    .input(TagListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, name, ...rest } = input as any;
      const where = buildDrizzleWhere(
        schema.tag,
        { ...rest, name },
        ["status"],
        { name },
      );

      const list = await ctx.db.tables.tag.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });
      const total = await ctx.db.tables.tag.count(undefined, where as any);

      return { list, total };
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
    .input(TagCreateSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.tag.insert(input as any);
      return input;
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.tag.deleteByIds(input.ids as string[]);
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(UpdateSchema(TagUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.tag.update(data as any, { id });
      return { id, ...data };
    }),
});
