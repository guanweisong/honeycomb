import "server-only";

import { z } from "zod";
import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
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
  index: permissionProcedure(Permission.commentReadAll)
    .input(CommentListQuerySchema)
    .query(({ input, ctx }) => listComments(ctx.db, input)),

  listByRef: publicProcedure
    .input(z.object({ id: IdSchema }).merge(CommentQuerySchema))
    .query(({ input, ctx }) => listPublicCommentsByRef(ctx.db, input)),

  create: publicProcedure
    .input(CommentInsertSchema)
    .mutation(({ ctx, input }) => createComment(ctx.db, ctx.header, input)),

  update: permissionProcedure(Permission.commentModerate)
    .input(CommentUpdateSchema)
    .mutation(({ input, ctx }) => updateComment(ctx.db, input)),

  destroy: permissionProcedure(Permission.commentModerate)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyComments(ctx.db, input)),
});
