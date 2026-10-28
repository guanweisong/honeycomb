import { listPublicCommentsByRef } from "@/features/comment/server/comment-public-queries";
import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/lib/trpc/core";
import { can, Permission } from "@/lib/auth/permissions";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { IdSchema } from "@/lib/validation/id.schema";
import type { CommentPreviewListItem } from "@/features/comment/types/comment.read-model";
import { CommentListQuerySchema } from "@/features/comment/schemas/comment.list-query.schema";
import { CommentUpdateSchema } from "@/features/comment/schemas/comment.update.schema";
import { CommentQuerySchema } from "@/features/comment/schemas/comment.query.schema";
import { CommentInsertSchema } from "@/features/comment/schemas/comment.insert.schema";
import {
  destroyComments,
  updateComment,
  createComment,
} from "@/features/comment/server/comment-commands";
import {
  logCommentNotificationFailure,
  notifyCommentCreated,
} from "@/features/comment/notifications/comment-delivery";
import { createCommentQueryRepository } from "@/features/comment/server/comment-query-repository";
import { createCommentCommandRepository } from "@/features/comment/server/comment-command-repository";
import { createCommentTargetRepository } from "@/features/comment/server/comment-target-repository";
import { createCommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";
import { validateCaptcha } from "@/lib/security/validate-captcha";
import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";
import { createApiRatelimit } from "@/lib/rate-limit/rate-limit";
import { createRateLimitedPublicProcedure } from "@/lib/trpc/rate-limited-procedure";
import { getClientIp } from "@/lib/http/client-ip";

/** 评论创建的独立高成本入口限流器。 */
const commentCreateRatelimit = createApiRatelimit({
  limit: 5,
  prefix: "ratelimit:comment-create",
});

const createCommentProcedure = createRateLimitedPublicProcedure({
  limiter: commentCreateRatelimit,
  namespace: "comment.create",
  fallbackLimit: 5,
});

export const commentRouter = createTRPCRouter({
  index: permissionProcedure(Permission.commentReadAll)
    .input(CommentListQuerySchema)
    .query(async ({ input, ctx }) => {
      const canReadPrivate = can(ctx.user.level, Permission.commentReadPrivate);
      // 搜索和排序同样会暴露私有字段，不能只在响应中删掉值。
      if (
        !canReadPrivate &&
        (input.email ||
          input.ip ||
          [
            "email",
            "ip",
            "userAgent",
            "parentId",
            "postId",
            "pageId",
            "customId",
          ].includes(input.sortField))
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const canReadUnpublished =
        can(ctx.user.level, Permission.postReadUnpublished) &&
        can(ctx.user.level, Permission.pageReadUnpublished);
      const result = await createCommentQueryRepository(ctx.db).list(
        input,
        canReadUnpublished ? "ALL" : "PUBLISHED_ONLY",
      );
      if (canReadPrivate) return result;
      return {
        total: result.total,
        list: result.list.map((comment): CommentPreviewListItem => ({
          id: comment.id,
          author: comment.author,
          content: comment.content,
          site: comment.site,
          status: comment.status,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          post: comment.post,
          page: comment.page,
          custom: comment.custom,
        })),
      };
    }),

  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(({ input, ctx }) =>
      listPublicCommentsByRef(
        createCommentQueryRepository(ctx.db),
        createCommentTargetRepository(ctx.db),
        input,
      ),
    ),

  create: createCommentProcedure
    .input(CommentInsertSchema)
    .mutation(async ({ ctx, input }) => {
      return createComment(
        {
          repository: createCommentCommandRepository(ctx.db),
          targetRepository: createCommentTargetRepository(ctx.db),
          validateCaptcha,
          notify: (commentId, parentId) =>
            notifyCommentCreated(
              createCommentNotificationRepository(ctx.db),
              commentId,
              parentId,
            ),
          logNotificationFailure: logCommentNotificationFailure,
          invalidator: publicContentInvalidator,
        },
        {
          ip: getClientIp({ headers: ctx.header }),
          userAgent: ctx.header.get("user-agent") ?? null,
        },
        input,
      );
    }),

  update: permissionProcedure(Permission.commentModerate)
    .input(CommentUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateComment(
        createCommentCommandRepository(ctx.db),
        input,
        publicContentInvalidator,
      );
      return result;
    }),

  destroy: permissionProcedure(Permission.commentModerate)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await destroyComments(
        createCommentCommandRepository(ctx.db),
        input.ids,
        publicContentInvalidator,
      );
      return result;
    }),
});
