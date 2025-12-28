import {
  protectedProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@/packages/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@/packages/validation/schemas/delete.batch.schema";
import { PostListQuerySchema } from "@/packages/validation/post/schemas/post.list.query.schema";
import { PostInsertSchema } from "@/packages/validation/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/packages/validation/post/schemas/post.update.schema";
import * as schema from "@/packages/db/schema";
import { and, eq, inArray, sql, or, like, InferInsertModel } from "drizzle-orm";
import { z } from "zod";
import { IdSchema } from "@/packages/validation/schemas/fields/id.schema";
import { getAllImageLinkFormMarkdown } from "@/packages/trpc/server/utils/getAllImageLinkFormMarkdown";
import { getRelationTags } from "@/packages/trpc/server/utils/getRelationTags";
import { UserLevel } from "@/packages/types/user/user.level";
import { TRPCError } from "@trpc/server";

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
      const {
        page = 1,
        limit = 10,
        sortField,
        sortOrder,
        title,
        content,
        categoryId,
        tagName,
        userName,
        ...rest
      } = input;

      let where = buildDrizzleWhere(
        schema.post,
        { ...rest, title, content },
        ["status", "type"],
        { title, content },
      );

      // 分类树过滤
      if (categoryId) {
        // 使用简单的子分类查询替代 sonsTree
        const subCategories = await ctx.db
          .select()
          .from(schema.category)
          .where(eq(schema.category.parent, categoryId));
        const ids = [categoryId, ...subCategories.map((c: any) => c.id)];
        const catClause = or(
          ...ids.map((id: string) => eq(schema.post.categoryId, id)),
        );
        where = where ? and(where, catClause) : catClause;
      }

      // 标签名过滤（通过在 tag 表查到 id，再对 JSON 文本字段做 LIKE）
      if (tagName) {
        const tagWhere = buildDrizzleWhere(schema.tag, { name: tagName }, [], {
          name: tagName,
        });
        const tags = await ctx.db
          .select()
          .from(schema.tag)
          .where(tagWhere)
          .limit(1);
        if (!tags.length) {
          return { list: [], total: 0 };
        }
        const tagId = tags[0].id;
        const idLike = `%${tagId}%`;
        const tagClause = or(
          like(schema.post.galleryStyleIds, idLike),
          like(schema.post.movieActorIds, idLike),
          like(schema.post.movieStyleIds, idLike),
          like(schema.post.movieDirectorIds, idLike),
        );
        where = where ? and(where, tagClause) : tagClause;
      }

      // 作者名过滤 -> 查 user 再比对 authorId
      if (userName) {
        const users = await ctx.db
          .select()
          .from(schema.user)
          .where(eq(schema.user.name, userName));
        if (!users.length) return { list: [], total: 0 };
        const authorClause = eq(schema.post.authorId, users[0].id);
        where = where ? and(where, authorClause) : authorClause;
      }

      const orderByClause = buildDrizzleOrderBy(
        schema.post,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      const list = await ctx.db
        .select()
        .from(schema.post)
        .where(where)
        .orderBy(orderByClause)
        .limit(limit)
        .offset((page - 1) * limit);

      // 批量加载关联数据以模拟 include
      const categoryIds = Array.from(
        new Set(list.map((p) => p.categoryId).filter(Boolean)),
      );
      const authorIds = Array.from(
        new Set(list.map((p) => p.authorId).filter(Boolean)),
      );
      const coverIds = Array.from(
        new Set(list.map((p) => p.coverId).filter(Boolean)),
      );

      const [categories, authors, covers] = await Promise.all([
        categoryIds.length
          ? ctx.db
              .select()
              .from(schema.category)
              .where(inArray(schema.category.id, categoryIds as any))
          : Promise.resolve([]),
        authorIds.length
          ? ctx.db
              .select()
              .from(schema.user)
              .where(inArray(schema.user.id, authorIds as any))
          : Promise.resolve([]),
        coverIds.length
          ? ctx.db
              .select()
              .from(schema.media)
              .where(inArray(schema.media.id, coverIds as any))
          : Promise.resolve([]),
      ]);
      const categoryMap = Object.fromEntries(
        categories.map((c: any) => [c.id, c]),
      );
      const authorMap = Object.fromEntries(authors.map((u) => [u.id, u]));
      const coverMap = Object.fromEntries(covers.map((m) => [m.id, m]));

      const mapped = list.map((item) => ({
        ...item,
        category: item.categoryId ? categoryMap[item.categoryId] : undefined,
        author: item.authorId ? authorMap[item.authorId] : undefined,
        cover: item.coverId ? coverMap[item.coverId] : undefined,
      }));

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.post)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list: mapped, total };
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

      // 获取分类信息
      const category = item.categoryId
        ? (
            await ctx.db
              .select()
              .from(schema.category)
              .where(eq(schema.category.id, item.categoryId))
              .limit(1)
          )?.[0]
        : undefined;

      // 获取作者信息
      const author = item.authorId
        ? (
            await ctx.db
              .select({
                id: schema.user.id,
                name: schema.user.name,
              })
              .from(schema.user)
              .where(eq(schema.user.id, item.authorId))
              .limit(1)
          )?.[0]
        : undefined;

      // 获取媒体信息
      const cover = item.coverId
        ? (
            await ctx.db
              .select()
              .from(schema.media)
              .where(eq(schema.media.id, item.coverId))
              .limit(1)
          )?.[0]
        : undefined;

      const [movieActors, movieDirectors, movieStyles, galleryStyles] =
        await Promise.all([
          getRelationTags(item?.movieActorIds ?? []),
          getRelationTags(item?.movieDirectorIds ?? []),
          getRelationTags(item?.movieStyleIds ?? []),
          getRelationTags(item?.galleryStyleIds ?? []),
        ]);

      const imageUrls = getAllImageLinkFormMarkdown(
        item?.content?.zh,
      ) as string[];
      const imagesInContent = imageUrls.length
        ? await ctx.db
            .select()
            .from(schema.media)
            .where(inArray(schema.media.url, imageUrls))
        : [];

      return {
        ...item,
        category,
        author,
        cover,
        movieActors,
        movieDirectors,
        movieStyles,
        galleryStyles,
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
   *
   * @notice 实现方式是获取分类下所有文章 ID，然后在内存中随机抽取。
   * 对于文章数量非常庞大的分类，这可能会有性能问题。
   */
  getRandomByCategory: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 先拿到所有 post.id
      const allPosts = await ctx.db
        .select({ id: schema.post.id })
        .from(schema.post)
        .where(eq(schema.post.categoryId, input.categoryId));

      const allIds = allPosts.map((p) => p.id);

      // 随机抽取
      const randomArr = (arr: string[], num: number) => {
        const result: string[] = [];
        const copy = [...arr];
        const length = Math.min(num, copy.length);
        for (let i = 0; i < length; i++) {
          const idx = Math.floor(Math.random() * copy.length);
          result.push(copy[idx]);
          copy.splice(idx, 1);
        }
        return result;
      };

      const randomIds = randomArr(allIds, 10);

      // 再查具体数据
      const posts = await ctx.db
        .select({
          id: schema.post.id,
          title: schema.post.title,
          quoteContent: schema.post.quoteContent,
        })
        .from(schema.post)
        .where(inArray(schema.post.id, randomIds));

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
});
