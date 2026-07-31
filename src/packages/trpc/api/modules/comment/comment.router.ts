import "server-only";

import { z } from "zod";
import {
  protectedProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { CommentListQuerySchema } from "./schemas/comment.list.query.schema";
import { CommentUpdateSchema } from "./schemas/comment.update.schema";
import { CommentQuerySchema } from "./schemas/comment.query.schema";
import { CommentInsertSchema } from "./schemas/comment.insert.schema";
import {
  createComment,
  destroyComments,
  listComments,
  listPublicCommentsByRef,
  updateComment,
} from "./comment.service";

export const commentRouter = createTRPCRouter({
  index: protectedProcedure([
    UserLevel.ADMIN,
    UserLevel.EDITOR,
    UserLevel.GUEST,
  ])
    .input(CommentListQuerySchema)
    .query(({ input, ctx }) => listComments(ctx.db, input)),

  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(({ input, ctx }) => listPublicCommentsByRef(ctx.db, input)),

  create: publicProcedure
    .input(CommentInsertSchema)
    .mutation(({ ctx, input }) => createComment(ctx.db, ctx.header, input)),

  update: protectedProcedure([UserLevel.ADMIN])
    .input(CommentUpdateSchema)
    .mutation(({ input, ctx }) => updateComment(ctx.db, input)),

  destroy: protectedProcedure([UserLevel.ADMIN])
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyComments(ctx.db, input)),
});
