import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProcedure,
  publicProcedure,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { PostListQuerySchema } from "@/features/post/schemas/post.list.query.schema";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";
import { TagType } from "@/packages/domain/content/tag";
import {
  createPost,
  destroyPosts,
  getCachedPostList,
  getPostDetail,
  getPostList,
  getPublishedPostCategoryId,
  getRandomPostsByCategory,
  updatePost,
  updatePostTags,
  incrementPostViews,
} from "@/features/post/application/post-use-cases";
import { createPostCommandRepository } from "@/features/post/infrastructure/post-command-repository";
import { createPostQueryRepository } from "@/features/post/infrastructure/post-query-repository";
import { createPostSpecialRepository } from "@/features/post/infrastructure/post-special-repository";

/** 文章 API 的传输层，只负责输入、权限和业务服务编排。 */
export const postRouter = createTRPCRouter({
  index: publicProcedure
    .input(PostListQuerySchema)
    .query(({ input, ctx }) =>
      ctx.hasRequest
        ? getCachedPostList(
            createPostSpecialRepository(
              ctx.db,
              createPostQueryRepository(ctx.db),
            ),
            input,
          )
        : getPostList(
            createPostQueryRepository(ctx.db),
            input,
            "PUBLISHED_ONLY",
          ),
    ),

  adminIndex: permissionProcedure(Permission.postReadAll)
    .input(PostListQuerySchema)
    .query(({ input, ctx }) =>
      getPostList(createPostQueryRepository(ctx.db), input, "ALL"),
    ),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await getPostDetail(
        createPostQueryRepository(ctx.db),
        input.id,
        "PUBLISHED_ONLY",
      );
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  adminDetail: permissionProcedure(Permission.postReadAll)
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await getPostDetail(
        createPostQueryRepository(ctx.db),
        input.id,
        "ALL",
      );
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  create: permissionProcedure(Permission.postCreate)
    .input(PostInsertSchema)
    .mutation(({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return createPost(
        createPostCommandRepository(ctx.db),
        input,
        ctx.user.id,
      );
    }),

  destroy: permissionProcedure(Permission.postDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) =>
      destroyPosts(createPostCommandRepository(ctx.db), input.ids),
    ),

  update: permissionProcedure(Permission.postUpdate)
    .input(PostUpdateSchema)
    .mutation(({ input, ctx }) =>
      updatePost(createPostCommandRepository(ctx.db), input),
    ),

  getRandomByCategory: publicProcedure
    .input(z.object({ categoryId: IdSchema }))
    .query(({ input, ctx }) =>
      getRandomPostsByCategory(
        createPostSpecialRepository(ctx.db, createPostQueryRepository(ctx.db)),
        input.categoryId,
      ),
    ),

  incrementViews: publicProcedure
    .input(z.object({ id: IdSchema }))
    .mutation(async ({ input, ctx }) => {
      const result = await incrementPostViews(
        createPostCommandRepository(ctx.db),
        input.id,
      );
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  getCategoryId: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ input, ctx }) =>
      getPublishedPostCategoryId(
        createPostSpecialRepository(ctx.db, createPostQueryRepository(ctx.db)),
        input.id,
      ),
    ),

  updateTags: permissionProcedure(Permission.postManageTags)
    .input(
      z.object({
        postId: IdSchema,
        tagIds: z.array(IdSchema),
        type: z.nativeEnum(TagType),
      }),
    )
    .mutation(({ input, ctx }) =>
      updatePostTags(createPostCommandRepository(ctx.db), input),
    ),
});
