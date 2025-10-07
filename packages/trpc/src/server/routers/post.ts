import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { PostListQuerySchema } from "@honeycomb/validation/post/schemas/post.list.query.schema";
import { PostInsertSchema } from "@honeycomb/validation/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@honeycomb/validation/post/schemas/post.update.schema";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq, inArray, sql, or, like } from "drizzle-orm";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";
import { MediaEntity } from "@honeycomb/validation/media/schemas/media.entity.schema";
import { getAllImageLinkFormMarkdown } from "@honeycomb/trpc/server/utils/getAllImageLinkFormMarkdown";
import { getRelationTags } from "@honeycomb/trpc/server/utils/getRelationTags";

export const postRouter = router({
  index: publicProcedure
    .input(PostListQuerySchema)
    .query(async ({ input, ctx }) => {
      const {
        page,
        limit,
        sortField,
        sortOrder,
        title,
        content,
        categoryId,
        tagName,
        userName,
        ...rest
      } = input as any;

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
      const mediaIds = Array.from(
        new Set(list.flatMap((p: any) => p.mediaId || [])),
      ).filter(Boolean);

      const [categories, authors, covers, mediaList] = await Promise.all([
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
        mediaIds.length
          ? ctx.db
              .select()
              .from(schema.media)
              .where(inArray(schema.media.id, mediaIds as any))
          : [],
      ]);
      const categoryMap = Object.fromEntries(
        categories.map((c: any) => [c.id, c]),
      );
      const authorMap = Object.fromEntries(authors.map((u) => [u.id, u]));
      const coverMap = Object.fromEntries(covers.map((m) => [m.id, m]));
      const mediaMap = Object.fromEntries(mediaList.map((m) => [m.id, m]));

      const mapped = list.map((item: any) => {
        return {
          ...item,
          category: item.categoryId
            ? (categoryMap[item.categoryId] ?? null)
            : null,
          author: item.authorId ? (authorMap[item.authorId] ?? null) : null,
          cover: item.coverId ? (coverMap[item.coverId] ?? null) : null,
          media: item.mediaId ? (mediaMap[item.mediaId] ?? null) : null,
        };
      });

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.post)
        .where(where);
      const total = Number(countResult?.count) || 0;

      return { list: mapped, total };
    }),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .output(z.any())
    .query(async ({ input, ctx }) => {
      const [item] = await ctx.db
        .select()
        .from(schema.post)
        .where(eq(schema.post.id, input.id as string))
        .limit(1);

      if (!item) return null;

      // 获取分类信息
      let category = null;
      if (item.categoryId) {
        [category] = await ctx.db
          .select()
          .from(schema.category)
          .where(eq(schema.category.id, item.categoryId))
          .limit(1);
      }

      // 获取作者信息
      let author = null;
      if (item.authorId) {
        [author] = await ctx.db
          .select({
            id: schema.user.id,
            name: schema.user.name,
          })
          .from(schema.user)
          .where(eq(schema.user.id, item.authorId))
          .limit(1);
      }

      // 获取媒体信息
      let cover = null;
      if (item.coverId) {
        [cover] = await ctx.db
          .select()
          .from(schema.media)
          .where(eq(schema.media.id, item.coverId))
          .limit(1);
      }

      let thumbnail = null;
      if (item.coverId) {
        [thumbnail] = await ctx.db
          .select()
          .from(schema.media)
          .where(eq(schema.media.id, item.coverId))
          .limit(1);
      }

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
      let imagesInContent: MediaEntity[] = [];
      if (imageUrls.length) {
        imagesInContent = await ctx.db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.url, imageUrls));
      }

      return {
        ...item,
        category,
        author,
        cover,
        thumbnail,
        movieActors,
        movieDirectors,
        movieStyles,
        galleryStyles,
        imagesInContent,
      };
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
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

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.post)
        .where(inArray(schema.post.id, input.ids));
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(PostUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedPost] = await ctx.db
        .update(schema.post)
        .set(input)
        .where(eq(schema.post.id, input.id))
        .returning();
      return updatedPost;
    }),

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

  getViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ views: schema.post.views })
        .from(schema.post)
        .where(eq(schema.post.id, input.id));
      return result ?? { views: 0 };
    }),

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
