import "server-only";

import {
  permissionProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { Permission } from "@/packages/identity/auth/permissions";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { PostListQuerySchema } from "@/packages/trpc/api/modules/post/schemas/post.list.query.schema";
import { PostInsertSchema } from "@/packages/trpc/api/modules/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/packages/trpc/api/modules/post/schemas/post.update.schema";
import * as schema from "@/packages/infrastructure/db/schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { z } from "zod";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { TRPCError } from "@trpc/server";
import { getPostDetail, getPostList } from "./post.service";
import { TagType } from "@/packages/domain/content/tag";
import {
  bumpCacheVersion,
  getCacheVersion,
  getCacheJSON,
  setCacheJSON,
} from "@/packages/trpc/api/utils/upstash-cache";
import { ContentVisibility } from "@/packages/trpc/api/types/content-visibility";
import { PostStatus } from "@/packages/domain/content/post-status";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { toPostInsertValues, toPostUpdateValues } from "./post-transforms";

const POST_INDEX_CACHE_VERSION_KEY = "cache:post:index:version";
const POST_INDEX_CACHE_NAMESPACE = "post.index";

/**
 * 文章相关的 tRPC 路由。
 */
export const postRouter = createTRPCRouter({
  /**
   * 查询文章列表（支持分页、多种筛选、排序和关联数据加载）。
   * @param {PostListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: PostWithRelations[], total: number }>} 返回一个包含文章列表和总记录数的对象。
   *
   * 筛选逻辑：
   * - 支持对状态、类型、标题、内容的筛选。
   * - **分类筛选**: 如果提供了 `categoryId`，会自动包含其所有子分类下的文章。
   * - **标签筛选**: 如果提供了 `tagId`，会按标签 ID 进行匹配。
   * - **作者筛选**: 如果提供了 `authorId`，会按作者 ID 进行匹配。
   */
  index: publicProcedure
    .input(PostListQuerySchema)
    .query(async ({ input, ctx }) => {
      const isBuildOrStaticCall = !ctx.hasRequest;
      if (isBuildOrStaticCall) {
        return getPostList(ctx.db, input, ContentVisibility.PUBLISHED_ONLY);
      }

      const cacheVersion = await getCacheVersion(
        POST_INDEX_CACHE_NAMESPACE,
        POST_INDEX_CACHE_VERSION_KEY,
      );
      const cacheKey = `post:index:v${cacheVersion}:${JSON.stringify(input)}`;
      const cached = await getCacheJSON<
        Awaited<ReturnType<typeof getPostList>>
      >(POST_INDEX_CACHE_NAMESPACE, cacheKey);
      if (cached) return cached;

      const result = await getPostList(
        ctx.db,
        input,
        ContentVisibility.PUBLISHED_ONLY,
      );
      await setCacheJSON(POST_INDEX_CACHE_NAMESPACE, cacheKey, result, 60 * 60);
      return result;
    }),

  adminIndex: permissionProcedure(Permission.postReadAll)
    .input(PostListQuerySchema)
    .query(({ input, ctx }) =>
      getPostList(ctx.db, input, ContentVisibility.ALL),
    ),

  /**
   * 获取单篇文章的详细信息。
   * @param {{ id: string }} input - 包含文章 ID 的对象。
   * @returns {Promise<object | null>} 返回包含文章所有关联信息（分类、作者、封面、标签、内容图片等）的完整对象
   */
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

  /**
   * 创建一篇新文章。
   * (需要管理员或编辑权限)
   * @param {PostInsertSchema} input - 新文章的数据。
   * @returns {Promise<Post>} 返回新创建的文章对象。
   */
  create: permissionProcedure(Permission.postCreate)
    .input(PostInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      if (!authorId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const [newPost] = await observeDbOperation("post.create", "insert", () =>
        ctx.db
          .insert(schema.post)
          .values(toPostInsertValues(input, authorId))
          .returning(),
      );
      await bumpCacheVersion(
        POST_INDEX_CACHE_NAMESPACE,
        POST_INDEX_CACHE_VERSION_KEY,
      );
      return newPost;
    }),

  /**
   * 批量删除文章。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的文章 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: permissionProcedure(Permission.postDelete)
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await observeDbOperation("post.destroy", "delete", () =>
        ctx.db.delete(schema.post).where(inArray(schema.post.id, input.ids)),
      );
      await bumpCacheVersion(
        POST_INDEX_CACHE_NAMESPACE,
        POST_INDEX_CACHE_VERSION_KEY,
      );
      return { success: true };
    }),

  /**
   * 更新一篇文章。
   * (需要管理员或编辑权限)
   * @param {PostUpdateSchema} input - 包含要更新的文章 ID 和新数据。
   * @returns {Promise<Post>} 返回更新后的文章对象。
   */
  update: permissionProcedure(Permission.postUpdate)
    .input(PostUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedPost] = await observeDbOperation(
        "post.update",
        "update",
        () =>
          ctx.db
            .update(schema.post)
            .set(toPostUpdateValues(rest))
            .where(eq(schema.post.id, id))
            .returning(),
      );
      await bumpCacheVersion(
        POST_INDEX_CACHE_NAMESPACE,
        POST_INDEX_CACHE_VERSION_KEY,
      );
      return updatedPost;
    }),

  /**
   * 在指定分类下随机获取文章。
   * @param {{ categoryId: string }} input - 包含分类 ID 的对象。
   * @returns {Promise<object[]>} 返回最多10篇随机文章的部分信息（id, title, quoteContent）。
   */
  getRandomByCategory: publicProcedure
    .input(z.object({ categoryId: IdSchema }))
    .query(async ({ ctx, input }) => {
      const posts = await observeDbOperation(
        "post.random-by-category",
        "select",
        () =>
          ctx.db
            .select({
              id: schema.post.id,
              title: schema.post.title,
              quoteContent: schema.post.quoteContent,
            })
            .from(schema.post)
            .where(
              and(
                eq(schema.post.categoryId, input.categoryId),
                eq(schema.post.status, PostStatus.PUBLISHED),
              ),
            )
            .orderBy(sql`RANDOM()`)
            .limit(10),
      );

      return posts;
    }),

  /**
   * 将指定文章的浏览量加一。
   * @param {{ id: string }} input - 包含文章 ID 的对象。
   * @returns {Promise<{ views: number }>} 返回更新后的浏览量。
   */
  incrementViews: publicProcedure
    .input(z.object({ id: IdSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updatedPage] = await observeDbOperation(
        "post.increment-views",
        "update",
        () =>
          ctx.db
            .update(schema.post)
            .set({
              views: sql`${schema.post.views} + 1`,
            })
            .where(
              and(
                eq(schema.post.id, input.id),
                eq(schema.post.status, PostStatus.PUBLISHED),
              ),
            )
            .returning({ views: schema.post.views }),
      );

      if (!updatedPage) throw new TRPCError({ code: "NOT_FOUND" });
      return updatedPage;
    }),

  /**
   * 获取指定文章的分类ID。
   * @param {{ id: string }} input - 包含文章 ID 的对象。
   * @returns {Promise<{ categoryId: string } | undefined>} 返回包含分类ID的对象，如果找不到则返回 undefined。
   */
  getCategoryId: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ ctx, input }) => {
      const [result] = await observeDbOperation(
        "post.category-id",
        "select",
        () =>
          ctx.db
            .select({ categoryId: schema.post.categoryId })
            .from(schema.post)
            .where(
              and(
                eq(schema.post.id, input.id),
                eq(schema.post.status, PostStatus.PUBLISHED),
              ),
            ),
      );

      return result;
    }),

  /**
   * 更新文章标签关联
   */
  updateTags: permissionProcedure(Permission.postManageTags)
    .input(
      z.object({
        postId: IdSchema,
        tagIds: z.array(IdSchema),
        type: z.nativeEnum(TagType),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await observeDbOperation("post.update-tags", "transaction", () =>
        ctx.db.transaction(async (tx) => {
          await tx
            .delete(schema.postTag)
            .where(
              and(
                eq(schema.postTag.postId, input.postId),
                eq(schema.postTag.type, input.type),
              ),
            );

          if (input.tagIds.length > 0) {
            await tx.insert(schema.postTag).values(
              input.tagIds.map((tagId) => ({
                postId: input.postId,
                tagId,
                type: input.type,
              })),
            );
          }
        }),
      );
      await bumpCacheVersion(
        POST_INDEX_CACHE_NAMESPACE,
        POST_INDEX_CACHE_VERSION_KEY,
      );
      return { success: true };
    }),
});
