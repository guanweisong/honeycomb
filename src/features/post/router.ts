import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/lib/trpc/core";
import { can, Permission } from "@/lib/auth/permissions";
import { IdSchema } from "@/lib/validation/id.schema";
import { PostListQuerySchema } from "@/features/post/schemas/post.list-query.schema";
import {
  PostInsertSchema,
  PostCreationResultInputSchema,
} from "@/features/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";
import { PostDeleteSchema } from "@/features/post/schemas/post.delete.schema";
import {
  createPost,
  destroyPosts,
  updatePost,
  getPostCreationResult,
  incrementPostViews,
} from "@/features/post/server/post-commands";
import {
  listPosts,
  listPublicPosts,
  getPost,
  getRandomPostsByCategory,
  getPublishedPostCategoryId,
} from "@/features/post/server/post-queries";
import { getCachedPostList } from "@/features/post/server/post-list-cache";
import { PostSearchInputSchema } from "@/features/post/schemas/post.search.schema";
import { searchPublishedPosts } from "@/features/post/server/post-search";
import { publicContentInvalidator } from "@/lib/cache/next-public-content-invalidator";

/** 文章 API 的传输层，只负责输入、权限和业务服务编排。 */
export const postRouter = createTRPCRouter({
  search: publicProcedure
    .input(PostSearchInputSchema)
    .query(({ input, ctx }) => searchPublishedPosts(ctx.db, input)),

  index: publicProcedure
    .input(PostListQuerySchema)
    .query(({ input, ctx }) =>
      ctx.hasRequest
        ? getCachedPostList(ctx.db, input)
        : listPublicPosts(ctx.db, input),
    ),

  adminIndex: permissionProcedure(Permission.postReadAll)
    .input(PostListQuerySchema)
    .query(({ input, ctx }) =>
      listPosts(
        ctx.db,
        input,
        can(ctx.user.level, Permission.postReadUnpublished)
          ? "ALL"
          : "PUBLISHED_ONLY",
      ),
    ),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await getPost(ctx.db, input.id, "PUBLISHED_ONLY");
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  adminDetail: permissionProcedure(Permission.postReadAll)
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await getPost(
        ctx.db,
        input.id,
        can(ctx.user.level, Permission.postReadUnpublished)
          ? "ALL"
          : "PUBLISHED_ONLY",
      );
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  create: permissionProcedure(Permission.postCreate)
    .input(PostInsertSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return createPost(ctx.db, input, ctx.user.id, publicContentInvalidator);
    }),

  destroy: permissionProcedure(Permission.postDelete)
    .input(PostDeleteSchema)
    .mutation(async ({ input, ctx }) => {
      return destroyPosts(ctx.db, input, ctx.user.id, publicContentInvalidator);
    }),

  update: permissionProcedure(Permission.postUpdate)
    .input(PostUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      return updatePost(ctx.db, input, ctx.user.id, publicContentInvalidator);
    }),

  getRandomByCategory: publicProcedure
    .input(z.object({ categoryId: IdSchema }))
    .query(({ input, ctx }) =>
      getRandomPostsByCategory(ctx.db, input.categoryId),
    ),

  incrementViews: publicProcedure
    .input(z.object({ id: IdSchema }))
    .mutation(async ({ input, ctx }) => {
      const result = await incrementPostViews(ctx.db, input.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  getCategoryId: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ input, ctx }) => getPublishedPostCategoryId(ctx.db, input.id)),

  creationResult: permissionProcedure(Permission.postCreate)
    .input(PostCreationResultInputSchema)
    .query(({ input, ctx }) =>
      getPostCreationResult(ctx.db, input.creationToken, ctx.user.id),
    ),
});
