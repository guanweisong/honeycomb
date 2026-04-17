import {
  protectedProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { PostListQuerySchema } from "@/packages/trpc/api/modules/post/schemas/post.list.query.schema";
import { PostInsertSchema } from "@/packages/trpc/api/modules/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/packages/trpc/api/modules/post/schemas/post.update.schema";
import * as schema from "@/packages/db/schema";
import { eq, inArray, sql, and, InferInsertModel } from "drizzle-orm";
import { z } from "zod";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { TRPCError } from "@trpc/server";
import { getAllImageLinkFormHtml } from "@/packages/trpc/api/utils/getAllImageLinkFormHtml";
import { getPostList } from "./post.service";
import { loadPostRelations } from "./utils/relations";
import { TagType } from "@/packages/trpc/api/modules/tag/types/tag.type";

/**
 * 文章相关的 tRPC 路由。
 */
export const postRouter = createTRPCRouter({
  /**
   * 查询文章列表（支持分页、多种筛选、排序和关联数据加载）。
   * @param {PostListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含文章列表和总记录数的对象。
   *
   * 筛选逻辑：
   * - 支持对状态、类型、标题、内容的筛选。
   * - **分类筛选**: 如果提供了 `categoryId`，会自动包含其所有子分类下的文章。
   * - **标签筛选**: 如果提供了 `tagName`，会先查找标签 ID，然后在多个存储标签ID的字段中进行模糊匹配。
   * - **作者筛选**: 如果提供了 `userName`，会先查找用户 ID，然后进行匹配。
   *
   * 数据关联：
   * 为了避免 N+1 查询，该端点会先查询出文章列表，然后收集所有需要关联的 ID（如 authorId, categoryId 等），
   * 最后通过一次性的批量查询将关联数据（作者、分类、封面图等）获取并合并到结果中。
   */
  index: publicProcedure
    .input(PostListQuerySchema)
    .query(async ({ input, ctx }) => {
      return getPostList(ctx.db, input);
    }),

  /**
   * 获取单篇文章的详细信息。
   * @param {{ id: string }} input - 包含文章 ID 的对象。
   * @returns {Promise<object | null>} 返回包含文章所有关联信息（分类、作者、封面、标签、内容图片等）的完整对象
   */
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const [item] = await ctx.db
        .select()
        .from(schema.post)
        .where(eq(schema.post.id, input.id as string))
        .limit(1);

      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      // 复用 loadPostRelations 加载关联数据
      const [result] = await loadPostRelations(ctx.db, [item]);

      // detail 特有的数据：内容中的图片
      const imageUrls = getAllImageLinkFormHtml(result?.content?.zh);
      const imagesInContent = imageUrls.length
        ? await ctx.db
            .select()
            .from(schema.media)
            .where(inArray(schema.media.url, imageUrls))
        : [];

      return {
        ...result,
        imagesInContent,
      };
    }),

  /**
   * 创建一篇新文章。
   * (需要管理员或编辑权限)
   * @param {PostInsertSchema} input - 新文章的数据。
   * @returns {Promise<Post>} 返回新创建的文章对象。
   */
  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(PostInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      const [newPost] = await ctx.db
        .insert(schema.post)
        .values({
          ...input,
          authorId,
        } as any)
        .returning();
      return newPost;
    }),

  /**
   * 批量删除文章。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的文章 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.post)
        .where(inArray(schema.post.id, input.ids));
      return { success: true };
    }),

  /**
   * 更新一篇文章。
   * (需要管理员或编辑权限)
   * @param {PostUpdateSchema} input - 包含要更新的文章 ID 和新数据。
   * @returns {Promise<Post>} 返回更新后的文章对象。
   */
  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(PostUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedPost] = await ctx.db
        .update(schema.post)
        .set(rest as Partial<InferInsertModel<typeof schema.post>>)
        .where(eq(schema.post.id, id))
        .returning();
      return updatedPost;
    }),

  /**
   * 在指定分类下随机获取文章。
   * @param {{ categoryId: string }} input - 包含分类 ID 的对象。
   * @returns {Promise<object[]>} 返回最多10篇随机文章的部分信息（id, title, quoteContent）。
   */
  getRandomByCategory: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db
        .select({
          id: schema.post.id,
          title: schema.post.title,
          quoteContent: schema.post.quoteContent,
        })
        .from(schema.post)
        .where(eq(schema.post.categoryId, input.categoryId))
        .orderBy(sql`RANDOM()`)
        .limit(10);

      return posts;
    }),

  /**
   * 获取指定文章的浏览量。
   * @param {{ id: string }} input - 包含文章 ID 的对象。
   * @returns {Promise<{ views: number }>} 返回包含浏览量的对象。
   */
  getViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ views: schema.post.views })
        .from(schema.post)
        .where(eq(schema.post.id, input.id));
      return result ?? { views: 0 };
    }),

  /**
   * 将指定文章的浏览量加一。
   * @param {{ id: string }} input - 包含文章 ID 的对象。
   * @returns {Promise<{ views: number }>} 返回更新后的浏览量。
   */
  incrementViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updatedPage] = await ctx.db
        .update(schema.post)
        .set({
          views: sql`${schema.post.views} + 1`,
        })
        .where(eq(schema.post.id, input.id))
        .returning({ views: schema.post.views });

      return updatedPage;
    }),

  /**
   * 获取指定文章的分类ID。
   * @param {{ id: string }} input - 包含文章 ID 的对象。
   * @returns {Promise<{ categoryId: string } | undefined>} 返回包含分类ID的对象，如果找不到则返回 undefined。
   */
  getCategoryId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ categoryId: schema.post.categoryId })
        .from(schema.post)
        .where(eq(schema.post.id, input.id));

      return result;
    }),

  /**
   * 更新文章标签关联
   */
  updateTags: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(z.object({ postId: IdSchema, tagIds: z.array(IdSchema), type: z.nativeEnum(TagType) }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(schema.postTag).where(and(
        eq(schema.postTag.postId, input.postId),
        eq(schema.postTag.type, input.type)
      ));
      if (input.tagIds.length > 0) {
        await ctx.db.insert(schema.postTag).values(input.tagIds.map(tagId => ({ postId: input.postId, tagId, type: input.type })));
      }
      return { success: true };
    }),
});
