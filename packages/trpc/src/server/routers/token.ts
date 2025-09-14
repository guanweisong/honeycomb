import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import { TokenListQuerySchema } from "@honeycomb/validation/token/schemas/token.list.query.schema";
import * as schema from "@honeycomb/db/src/schema";

export const tokenRouter = router({
  index: protectedProcedure(["ADMIN"])
    .input(TokenListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = rest;

      const list = await ctx.db.tables.token.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });

      const total = await ctx.db.tables.token.count(undefined, where as any);

      return { list, total };
    }),
});
