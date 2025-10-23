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
import * as schema from "@honeycomb/db/schema";
import { eq, inArray, and, sql, InferInsertModel, asc, SQL } from "drizzle-orm";
import { CommentStatus } from "@honeycomb/types/comment/comment.status";
import { getCustomCommentLink } from "@honeycomb/trpc/server/utils/getCustomCommentLink";
import { CommentInsertSchema } from "@honeycomb/validation/comment/schemas/comment.insert.schema";
import AdminCommentEmailMessage from "@honeycomb/trpc/server/components/EmailMessage/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "@honeycomb/trpc/server/components/EmailMessage/ReplyCommentEmailMessage";
import { selectAllColumns } from "@honeycomb/trpc/server/utils/selectAllColumns";
import { validateCaptcha } from "@honeycomb/trpc/server/libs/validateCaptcha";
import { CommentEntity } from "@honeycomb/trpc/server/types/comment.entity";
import { SettingEntity } from "@honeycomb/validation/setting/schemas/setting.entity.schema";
import { PostEntity } from "@honeycomb/trpc/server/types/post.entity";
import { PageEntity } from "@honeycomb/validation/page/schemas/page.entity.schema";
import { UserLevel } from "@honeycomb/types/user/user.level";

/**
 * 评论相关的 tRPC 路由。
 */
export const commentRouter = router({
  /**
   * 查询评论列表（后台管理使用）。
   * 支持分页、筛选和排序，并会附加关联的文章或页面信息。
   * @param {CommentListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含评论列表和总记录数的对象。
   */
  index: publicProcedure
    .input(CommentListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, ...rest } = input;
      const where = buildDrizzleWhere(schema.comment, rest, ["status"]);

      // 构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.comment,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list: CommentEntity[] = await ctx.db
        .select()
        .from(schema.comment)
        .where(where)
        .orderBy(orderByClause)
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
        new Set(list.map((c) => c.postId).filter(Boolean)),
      ) as string[];
      const pageIds = Array.from(
        new Set(list.map((c) => c.pageId).filter(Boolean)),
      ) as string[];

      const [posts, pages] = await Promise.all([
        postIds.length
          ? ctx.db
              .select()
              .from(schema.post)
              .where(inArray(schema.post.id, postIds))
          : Promise.resolve([] as PostEntity[]),
        pageIds.length
          ? ctx.db
              .select()
              .from(schema.page)
              .where(inArray(schema.page.id, pageIds))
          : Promise.resolve([] as PageEntity[]),
      ]);
      const postMap = Object.fromEntries(posts.map((p) => [p.id, p]));
      const pageMap = Object.fromEntries(pages.map((p) => [p.id, p]));
      const listWithRefs = list.map((c) => ({
        ...c,
        post: c.postId ? (postMap[c.postId] ?? null) : null,
        page: c.pageId ? (pageMap[c.pageId] ?? null) : null,
      }));

      return { list: listWithRefs, total };
    }),

  /**
   * 根据关联资源获取树状评论列表（前台展示使用）。
   * @param {object} input - 包含资源 `id` 和 `type` (CATEGORY, PAGE, CUSTOM)。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含树状评论列表和总数的对象。
   *
   * 工作流程：
   * 1. 只查询 `PUBLISH` 和 `BAN` 状态的评论。
   * 2. 根据输入的 `type` 和 `id` 构建查询条件，找到特定资源下的所有评论。
   * 3. 对查询结果进行处理，计算每个评论者的 Gravatar 头像 URL。
   * 4. 使用 `list-to-tree-lite` 库将扁平的评论列表转换为树状结构。
   * 5. 查询并返回总评论数。
   */
  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(async ({ input, ctx }) => {
      const publishOrBan = ["PUBLISH", "BAN"] as const;
      // base where: status in publishOrBan
      const baseWhere = inArray(schema.comment.status, publishOrBan);
      let where: SQL | undefined = baseWhere;
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
            result.map((item) => ({
              ...item,
              id: item.id.toString(),
              avatar: `https://cravatar.cn/avatar/${md5(
                item.email!.trim().toLowerCase(),
              )}?s=48&d=identicon`,
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

  /**
   * 创建一条新评论，并触发邮件通知。
   * @param {CommentInsertSchema} input - 新评论的数据。
   * @returns {Promise<object>} 返回包含完整信息的新评论对象。
   *
   * 工作流程：
   * 1. **插入评论**: 将评论数据存入数据库，并自动记录请求的 IP 地址和 User Agent。
   * 2. **查询新评论**: 查询刚创建的评论及其关联的文章/页面信息。
   * 3. **处理自定义链接**: 如果评论关联到自定义实体，生成对应的链接。
   * 4. **获取设置**: 查询网站的全局设置，用于邮件内容。
   * 5. **通知管理员**: 异步发送一封邮件通知管理员有新评论。
   * 6. **通知被回复者**: 如果是回复别人的评论，则查询父评论信息，并异步发送邮件通知被回复者。
   */
  create: publicProcedure
    .input(CommentInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { captcha, ...rest } = input;

      await validateCaptcha(captcha);

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

      // ====== setting ======
      const [setting] = await ctx.db.select().from(schema.setting);

      if (!currentComment || !setting) {
        throw new Error("Comment or setting not found");
      }

      // ====== custom link ======
      const currentCustom = getCustomCommentLink(currentComment.customId);
      const currentCommentWithCustom = {
        ...currentComment,
        custom: currentCustom,
      };

      const siteNameZh = setting.siteName?.zh ?? "";
      const systemEmail = `notice@guanweisong.com`;

      const resend = new Resend(process.env.RESEND_API_KEY);

      // 向管理员发送邮件通知
      // 重要：管理员邮箱地址应在环境变量 `ADMIN_EMAIL` 中配置
      resend.emails
        .send({
          from: systemEmail,
          to: process.env.ADMIN_EMAIL!,
          subject: `[${siteNameZh}]有一条新的评论`,
          react: AdminCommentEmailMessage({
            currentComment: currentCommentWithCustom as CommentEntity,
            setting: setting as SettingEntity,
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
            ...selectAllColumns(schema.comment),
            post: { id: schema.post.id, title: schema.post.title },
            page: { id: schema.page.id, title: schema.page.title },
          })
          .from(schema.comment)
          .leftJoin(schema.post, eq(schema.comment.postId, schema.post.id))
          .leftJoin(schema.page, eq(schema.comment.pageId, schema.page.id))
          .where(eq(schema.comment.id, rest.parentId));

        if (parentComment) {
          const parentCustom = getCustomCommentLink(parentComment.customId);
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
                currentComment: currentCommentWithCustom as CommentEntity,
                setting: setting as SettingEntity,
                parentComment: parentCommentWithCustom as CommentEntity,
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

  /**
   * 更新一条评论（通常是更新状态）。
   * (需要管理员权限)
   * @param {CommentUpdateSchema} input - 包含要更新的评论 ID 和新数据。
   * @returns {Promise<Comment>} 返回更新后的评论对象。
   */
  update: protectedProcedure([UserLevel.ADMIN])
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

  /**
   * 批量删除评论。
   * (需要管理员权限)
   * @param {DeleteBatchSchema} input - 包含要删除的评论 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.comment)
        .where(inArray(schema.comment.id, input.ids));
      return { success: true };
    }),
});
