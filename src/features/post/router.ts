import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
  mapApplicationError,
} from "@/lib/trpc/core";
import { can, Permission } from "@/lib/auth/permissions";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { IdSchema } from "@/lib/validation/id.schema";
import {
  PostListQuerySchema,
  PostInsertSchema,
  PostUpdateSchema,
  PostTagUpdateSchema,
} from "@/features/post/schema";
import {
  createPost,
  destroyPosts,
  updatePost,
  updatePostTags,
  incrementPostViews,
} from "@/features/post/server/post-commands";
import { listPosts, getPost } from "@/features/post/server/post-queries";
import {
  getCachedPostList,
  getRandomPostsByCategory,
  getPublishedPostCategoryId,
} from "@/features/post/server/post-special";
import { PostSearchInputSchema } from "@/features/post/post-search";
import { searchPublishedPosts } from "@/features/post/server/post-search";
import { publicContentInvalidator } from "@/lib/cache/refresh-path";

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
        : listPosts(ctx.db, input, "PUBLISHED_ONLY"),
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
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      return destroyPosts(ctx.db, input.ids, publicContentInvalidator);
    }),

  update: permissionProcedure(Permission.postUpdate)
    .input(PostUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      return updatePost(ctx.db, input, publicContentInvalidator).catch(
        mapApplicationError,
      );
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

  updateTags: permissionProcedure(Permission.postManageTags)
    .input(PostTagUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      return updatePostTags(ctx.db, input, publicContentInvalidator);
    }),
});
