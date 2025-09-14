import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { CommentListQuerySchema } from "@honeycomb/validation/comment/schemas/comment.list.query.schema";
import { CommentUpdateSchema } from "@honeycomb/validation/comment/schemas/comment.update.schema";
import { CommentQuerySchema } from "@honeycomb/validation/comment/schemas/comment.query.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
// @ts-ignore
import listToTree from "list-to-tree-lite";
import md5 from "md5";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, and } from "drizzle-orm";

export const commentRouter = router({
  index: publicProcedure
    .input(CommentListQuerySchema.default({}))
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.comment, rest, ["status"]);
      const list = await ctx.db.tables.comment.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });

      // attach minimal refs
      const postIds = Array.from(
        new Set(list.map((c: any) => c.postId).filter(Boolean)),
      );
      const pageIds = Array.from(
        new Set(list.map((c: any) => c.pageId).filter(Boolean)),
      );
      const [posts, pages] = await Promise.all([
        postIds.length
          ? ctx.db.tables.post.select({
              whereExpr: inArray(schema.post.id, postIds as any),
            })
          : Promise.resolve([] as any[]),
        pageIds.length
          ? ctx.db.tables.page.select({
              whereExpr: inArray(schema.page.id, pageIds as any),
            })
          : Promise.resolve([] as any[]),
      ]);
      const postMap = Object.fromEntries(posts.map((p: any) => [p.id, p]));
      const pageMap = Object.fromEntries(pages.map((p: any) => [p.id, p]));
      const listWithRefs = list.map((c: any) => ({
        ...c,
        post: c.postId ? (postMap[c.postId] ?? null) : null,
        page: c.pageId ? (pageMap[c.pageId] ?? null) : null,
      }));

      const count = await ctx.db.tables.comment.count(undefined, where as any);

      return { list: listWithRefs, total: count };
    }),

  // 针对某个资源(id + type)获取树形评论
  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(async ({ input, ctx }) => {
      const publishOrBan = ["PUBLISH", "BAN"] as const;
      // base where: status in publishOrBan
      const baseWhere = inArray(schema.comment.status, publishOrBan as any);
      let where = baseWhere as any;
      switch (input.type) {
        case "CATEGORY":
          where = and(where, eq(schema.comment.postId, input.id));
          break;
        case "PAGE":
          where = and(where, eq(schema.comment.pageId, input.id));
          break;
        case "CUSTOM":
          where = and(where, eq(schema.comment.customId, input.id));
          break;
      }
      const result = await ctx.db.tables.comment.select({
        whereExpr: where,
        orderBy: { field: "createdAt", direction: "asc" },
      });

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

      const count = await ctx.db.tables.comment.count(undefined, where);
      return { list, total: count };
    }),

  update: protectedProcedure(["ADMIN"])
    .input(UpdateSchema(CommentUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.comment.update(data as any, { id });
      return { id, ...data };
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.comment.deleteByIds(input.ids as string[]);
      return { success: true };
    }),
});
