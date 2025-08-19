import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { MediaListQuerySchema } from "@honeycomb/validation/media/schemas/media.list.query.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { UserLevel } from ".prisma/client";

export const mediaRouter = router({
  index: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST])
    .input(MediaListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const conditions = Tools.getFindConditionsByQueries(rest, []);
      const list = await ctx.prisma.media.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await ctx.prisma.media.count({ where: conditions });
      return { list, total };
    }),

  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      // 仅删除数据库记录；对象存储删除建议在独立服务或触发器中完成
      await ctx.prisma.media.deleteMany({ where: { id: { in: input.ids } } });
      return { success: true };
    }),
});
