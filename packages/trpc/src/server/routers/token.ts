import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { TokenListQuerySchema } from "@honeycomb/validation/token/schemas/token.list.query.schema";
import { UserLevel } from ".prisma/client";

export const tokenRouter = router({
  index: protectedProcedure([UserLevel.ADMIN])
    .input(TokenListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const conditions = Tools.getFindConditionsByQueries(rest, ["status"]);
      const list = await ctx.prisma.token.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await ctx.prisma.token.count({ where: conditions });
      return { list, total };
    }),
});
