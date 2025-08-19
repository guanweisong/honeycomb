import { protectedProcedure, publicProcedure, router } from "@honeycomb/trpc/server/core";
import Tools from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { CommentListQuerySchema } from "@honeycomb/validation/comment/schemas/comment.list.query.schema";
import { CommentUpdateSchema } from "@honeycomb/validation/comment/schemas/comment.update.schema";
import { CommentQuerySchema } from "@honeycomb/validation/comment/schemas/comment.query.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { CommentStatus, UserLevel } from ".prisma/client";
// @ts-ignore
import listToTree from "list-to-tree-lite";
import md5 from "md5";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";

export const commentRouter = router({
  index: publicProcedure
    .input(CommentListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const conditions = Tools.getFindConditionsByQueries(rest, ["status"]);
      const list = await ctx.prisma.comment.findMany({
        where: conditions,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          post: { select: { id: true, title: true } },
          page: { select: { id: true, title: true } },
        },
      });
      const total = await ctx.prisma.comment.count({ where: conditions });
      return { list, total };
    }),

  // 针对某个资源(id + type)获取树形评论
  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(async ({ input, ctx }) => {
      const condition: any = { status: { in: [CommentStatus.PUBLISH, CommentStatus.BAN] } };
      switch (input.type) {
        case "CATEGORY":
          condition.postId = input.id;
          break;
        case "PAGE":
          condition.pageId = input.id;
          break;
        case "CUSTOM":
          condition.customId = input.id;
          break;
      }
      const result = await ctx.prisma.comment.findMany({ where: condition, orderBy: { createdAt: "asc" } });
      const list = result.length
        ? listToTree(
            result.map((item: any) => ({
              ...item,
              id: item.id.toString(),
              avatar: `https://cravatar.cn/avatar/${md5(item.email.trim().toLowerCase())}?s=48&d=identicon`,
            })),
            { idKey: "id", parentKey: "parentId" },
          )
        : [];
      const total = await ctx.prisma.comment.count({ where: condition });
      return { list, total };
    }),

  update: protectedProcedure([UserLevel.ADMIN])
    .input(UpdateSchema(CommentUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      return await ctx.prisma.comment.update({ where: { id }, data });
    }),

  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.comment.deleteMany({ where: { id: { in: input.ids } } });
      return { success: true };
    }),
});
