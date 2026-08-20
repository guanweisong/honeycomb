import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { CommentListQuerySchema } from "@/packages/trpc/api/modules/comment/schemas/comment.list.query.schema";
import { CommentUpdateSchema } from "@/packages/trpc/api/modules/comment/schemas/comment.update.schema";
import { CommentQuerySchema } from "@/packages/trpc/api/modules/comment/schemas/comment.query.schema";
import { CommentInsertSchema } from "@/packages/trpc/api/modules/comment/schemas/comment.insert.schema";
import {
  destroyComments,
  updateComment,
  createComment,
  CommentTargetError,
  listComments,
  listPublicCommentsByRef,
  notifyCommentCreated,
} from "@/features/comment/comment.service";
import { createCommentQueryRepository } from "@/features/comment/infrastructure/comment-query-repository";
import { createCommentCommandRepository } from "@/features/comment/infrastructure/comment-command-repository";
import { createCommentNotificationRepository } from "@/features/comment/infrastructure/comment-notification-repository";

function mapCommentTargetError(error: unknown): never {
  if (error instanceof CommentTargetError)
    throw new TRPCError({
      code: error.code,
      message: error.message || error.code,
    });
  throw error;
}

export const commentRouter = createTRPCRouter({
  index: permissionProcedure(Permission.commentReadAll)
    .input(CommentListQuerySchema)
    .query(({ input, ctx }) => listComments(createCommentQueryRepository(ctx.db), input)),

  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(({ input, ctx }) =>
      listPublicCommentsByRef(createCommentQueryRepository(ctx.db), input).catch(mapCommentTargetError),
    ),

  create: publicProcedure
    .input(CommentInsertSchema)
    .mutation(({ ctx, input }) =>
      createComment(createCommentCommandRepository(ctx.db), ctx.header, input, (commentId, parentId) =>
        notifyCommentCreated(createCommentNotificationRepository(ctx.db), commentId, parentId),
      ).catch(mapCommentTargetError),
    ),

  update: permissionProcedure(Permission.commentModerate)
    .input(CommentUpdateSchema)
    .mutation(({ input, ctx }) => updateComment(createCommentCommandRepository(ctx.db), input)),

  destroy: permissionProcedure(Permission.commentModerate)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyComments(createCommentCommandRepository(ctx.db), input.ids)),
});
