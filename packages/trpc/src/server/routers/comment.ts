import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { CommentListQuerySchema } from "@honeycomb/validation/comment/schemas/comment.list.query.schema";
import { CommentUpdateSchema } from "@honeycomb/validation/comment/schemas/comment.update.schema";
import { CommentQuerySchema } from "@honeycomb/validation/comment/schemas/comment.query.schema";
import listToTree from "list-to-tree-lite";
import md5 from "md5";
import { Resend } from "resend";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, and, sql, InferInsertModel, asc } from "drizzle-orm";
import { CommentStatus } from "@honeycomb/db/src/types";
import { getCustomCommentLink } from "@honeycomb/trpc/server/utils/getCustomCommentLink";
import { CommentInsertSchema } from "@honeycomb/validation/comment/schemas/comment.insert.schema";
import AdminCommentEmailMessage from "@honeycomb/trpc/server/components/EmailMessage/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "@honeycomb/trpc/server/components/EmailMessage/ReplyCommentEmailMessage";
import { selectAllColumns } from "@honeycomb/trpc/server/utils/selectAllColumns";

export const commentRouter = router({
  index: publicProcedure
    .input(CommentListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input as any;
      const where = buildDrizzleWhere(schema.comment, rest, ["status"]);

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.comment,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.comment)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 查询总数
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.comment)
        .where(where);
      const total = Number(countResult?.count) || 0;

      // attach minimal refs
      const postIds = Array.from(
        new Set(list.map((c: any) => c.postId).filter(Boolean)),
      );
      const pageIds = Array.from(
        new Set(list.map((c: any) => c.pageId).filter(Boolean)),
      );
      const [posts, pages] = await Promise.all([
        postIds.length
          ? ctx.db
              .select()
              .from(schema.post)
              .where(inArray(schema.post.id, postIds as any))
          : Promise.resolve([] as any[]),
        pageIds.length
          ? ctx.db
              .select()
              .from(schema.page)
              .where(inArray(schema.page.id, pageIds as any))
          : Promise.resolve([] as any[]),
      ]);
      const postMap = Object.fromEntries(posts.map((p: any) => [p.id, p]));
      const pageMap = Object.fromEntries(pages.map((p: any) => [p.id, p]));
      const listWithRefs = list.map((c: any) => ({
        ...c,
        post: c.postId ? (postMap[c.postId] ?? null) : null,
        page: c.pageId ? (pageMap[c.pageId] ?? null) : null,
      }));

      return { list: listWithRefs, total };
    }),

  // 针对某个资源(id + type)获取树形评论
  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(async ({ input, ctx }) => {
      const publishOrBan = ["PUBLISH", "BAN"] as const;
      // base where: status in publishOrBan
      const baseWhere = inArray(schema.comment.status, publishOrBan);
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
      const result = await ctx.db
        .select()
        .from(schema.comment)
        .where(where)
        .orderBy(asc(schema.comment.createdAt));

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

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.comment)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list, total };
    }),

  create: publicProcedure
    .input(CommentInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { captcha, ...rest } = input;

      // 插入评论
      const [created] = await ctx.db
        .insert(schema.comment)
        .values({
          ...rest,
          ip: ctx.header.get("x-forwarded-for") ?? null,
          userAgent: ctx.header.get("user-agent") ?? null,
          status: CommentStatus.PUBLISH,
        })
        .returning();

      const [currentComment] = await ctx.db
        .select({
          ...selectAllColumns(schema.comment),
          post: { id: schema.post.id, title: schema.post.title },
          page: { id: schema.page.id, title: schema.page.title },
        })
        .from(schema.comment)
        .leftJoin(schema.post, eq(schema.comment.postId, schema.post.id))
        .leftJoin(schema.page, eq(schema.comment.pageId, schema.page.id))
        .where(eq(schema.comment.id, created.id));

      // ====== custom link ======
      const currentCustom = getCustomCommentLink(currentComment?.customId);
      const currentCommentWithCustom = {
        ...currentComment,
        custom: currentCustom,
      };

      // ====== setting ======
      const [setting] = await ctx.db.select().from(schema.setting);
      const siteNameZh = setting?.siteName?.zh ?? "";
      const systemEmail = `notice@guanweisong.com`;

      const resend = new Resend(process.env.RESEND_API_KEY);

      // ====== 通知管理员 ======
      resend.emails
        .send({
          from: systemEmail,
          to: "307761682@qq.com",
          subject: `[${siteNameZh}]有一条新的评论`,
          react: AdminCommentEmailMessage({
            currentComment: currentCommentWithCustom,
            setting: setting,
          }),
        })
        .then((e) => {
          console.log("SendEmail Success", e);
        })
        .catch((e) => {
          console.log("SendEmail Error", e);
        });

      // ====== 通知被评论人 ======
      if (rest.parentId) {
        const [parentComment] = await ctx.db
          .select({
            id: schema.comment.id,
            email: schema.comment.email,
            customId: schema.comment.customId,
            content: schema.comment.content,
          })
          .from(schema.comment)
          .where(eq(schema.comment.id, rest.parentId));

        if (parentComment) {
          const parentCustom = getCustomCommentLink(parentComment?.customId);
          const parentCommentWithCustom = {
            ...parentComment,
            custom: parentCustom,
          };
          resend.emails
            .send({
              from: systemEmail,
              to: parentComment.email as string,
              subject: `您在[${siteNameZh}]的评论有新的回复`,
              react: ReplyCommentEmailMessage({
                currentComment: currentCommentWithCustom,
                setting: setting,
                parentComment: parentCommentWithCustom,
              }),
            })
            .then((e) => {
              console.log("SendEmail Success", e);
            })
            .catch((e) => {
              console.log("SendEmail Error", e);
            });
        }
      }

      return currentCommentWithCustom;
    }),

  update: protectedProcedure(["ADMIN"])
    .input(CommentUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedComment] = await ctx.db
        .update(schema.comment)
        .set(rest as Partial<InferInsertModel<typeof schema.comment>>)
        .where(eq(schema.comment.id, id))
        .returning();
      return updatedComment;
    }),

  destroy: protectedProcedure(["ADMIN"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.comment)
        .where(inArray(schema.comment.id, input.ids));
      return { success: true };
    }),
});
