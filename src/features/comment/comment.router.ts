import "server-only";

import { z } from "zod";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
  mapApplicationError,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { CommentListQuerySchema } from "@/features/comment/schemas/comment.list.query.schema";
import { CommentUpdateSchema } from "@/features/comment/schemas/comment.update.schema";
import { CommentQuerySchema } from "@/features/comment/schemas/comment.query.schema";
import { CommentInsertSchema } from "@/features/comment/schemas/comment.insert.schema";
import {
  destroyComments,
  updateComment,
  createComment,
  listComments,
  listPublicCommentsByRef,
} from "@/features/comment/application/comment-use-cases";
import {
  logCommentNotificationFailure,
  notifyCommentCreated,
} from "@/features/comment/notifications/comment-delivery";
import { createCommentQueryRepository } from "@/features/comment/infrastructure/comment-query-repository";
import { createCommentCommandRepository } from "@/features/comment/infrastructure/comment-command-repository";
import { createCommentTargetRepository } from "@/features/comment/infrastructure/comment-target-repository";
import { createCommentNotificationRepository } from "@/features/comment/infrastructure/comment-notification-repository";
import { validateCaptcha } from "@/packages/infrastructure/security/validate-captcha";
import { publicContentInvalidator } from "@/packages/infrastructure/refresh-path";
import { commentCreateRatelimit } from "@/packages/infrastructure/rate-limit/rate-limit";
import { createRateLimitedPublicProcedure } from "@/packages/trpc/api/rate-limited-procedure";
import { getClientIp } from "@/packages/infrastructure/http/client-ip";

const createCommentProcedure = createRateLimitedPublicProcedure({
  limiter: commentCreateRatelimit,
  namespace: "comment.create",
});

export const commentRouter = createTRPCRouter({
  index: permissionProcedure(Permission.commentReadAll)
    .input(CommentListQuerySchema)
    .query(({ input, ctx }) =>
      listComments(createCommentQueryRepository(ctx.db), input),
    ),

  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(({ input, ctx }) =>
      listPublicCommentsByRef(
        createCommentQueryRepository(ctx.db),
        createCommentTargetRepository(ctx.db),
        input,
      ).catch(mapApplicationError),
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
      ).catch(mapApplicationError);
    }),

  update: permissionProcedure(Permission.commentModerate)
    .input(CommentUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateComment(
        createCommentCommandRepository(ctx.db),
        input,
        publicContentInvalidator,
      ).catch(mapApplicationError);
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
