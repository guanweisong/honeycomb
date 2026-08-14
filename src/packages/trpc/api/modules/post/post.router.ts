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
import { PostListQuerySchema } from "./schemas/post.list.query.schema";
import { PostInsertSchema } from "./schemas/post.insert.schema";
import { PostUpdateSchema } from "./schemas/post.update.schema";
import { TagType } from "@/packages/domain/content/tag";
import { ContentVisibility } from "@/packages/trpc/api/types/content-visibility";
import {
  createPost,
  destroyPosts,
  getCachedPostList,
  getPostDetail,
  getPostList,
  getPublishedPostCategoryId,
  getRandomPostsByCategory,
  incrementPostViews,
  updatePost,
  updatePostTags,
} from "./post.service";

/** 文章 API 的传输层，只负责输入、权限和业务服务编排。 */
export const postRouter = createTRPCRouter({
  index: publicProcedure
    .input(PostListQuerySchema)
    .query(({ input, ctx }) =>
      ctx.hasRequest
        ? getCachedPostList(ctx.db, input)
        : getPostList(ctx.db, input, ContentVisibility.PUBLISHED_ONLY),
    ),

  adminIndex: permissionProcedure(Permission.postReadAll)
    .input(PostListQuerySchema)
    .query(({ input, ctx }) =>
      getPostList(ctx.db, input, ContentVisibility.ALL),
    ),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await getPostDetail(
        ctx.db,
        input.id,
        ContentVisibility.PUBLISHED_ONLY,
      );
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  adminDetail: permissionProcedure(Permission.postReadAll)
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const result = await getPostDetail(
        ctx.db,
        input.id,
        ContentVisibility.ALL,
      );
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  create: permissionProcedure(Permission.postCreate)
    .input(PostInsertSchema)
    .mutation(({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return createPost(ctx.db, input, ctx.user.id);
    }),

  destroy: permissionProcedure(Permission.postDelete)
    .input(DeleteBatchSchema)
    .mutation(({ input, ctx }) => destroyPosts(ctx.db, input.ids)),

  update: permissionProcedure(Permission.postUpdate)
    .input(PostUpdateSchema)
    .mutation(({ input, ctx }) => updatePost(ctx.db, input)),

  getRandomByCategory: publicProcedure
    .input(z.object({ categoryId: IdSchema }))
    .query(({ input, ctx }) =>
      getRandomPostsByCategory(ctx.db, input.categoryId),
    ),

  incrementViews: publicProcedure
    .input(z.object({ id: IdSchema }))
    .mutation(({ input, ctx }) => incrementPostViews(ctx.db, input.id)),

  getCategoryId: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(({ input, ctx }) => getPublishedPostCategoryId(ctx.db, input.id)),

  updateTags: permissionProcedure(Permission.postManageTags)
    .input(
      z.object({
        postId: IdSchema,
        tagIds: z.array(IdSchema),
        type: z.nativeEnum(TagType),
      }),
    )
    .mutation(({ input, ctx }) => updatePostTags(ctx.db, input)),
});
