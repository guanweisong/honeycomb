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
} from "@/features/comment/application";
import { CommentTargetError, listComments, listPublicCommentsByRef } from "@/features/comment/application";

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
    .query(({ input, ctx }) => listComments(ctx.db, input)),

  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(({ input, ctx }) =>
      listPublicCommentsByRef(ctx.db, input).catch(mapCommentTargetError),
    ),

  create: publicProcedure
    .input(CommentInsertSchema)
    .mutation(({ ctx, input }) =>
      createComment(ctx.db, ctx.header, input).catch(mapCommentTargetError),
    ),

  update: permissionProcedure(Permission.commentModerate)
    .input(CommentUpdateSchema)
    .mutation(({ input, ctx }) => updateComment(ctx.db, input)),

  destroy: permissionProcedure(Permission.commentModerate)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyComments(ctx.db, input.ids)),
});
