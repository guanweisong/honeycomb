import {
  protectedProcedure,
  publicProcedure,
  router,
} from "@honeycomb/trpc/server/core";
import Tools, { buildDrizzleWhere } from "@honeycomb/trpc/server/libs/tools";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { PostListQuerySchema } from "@honeycomb/validation/post/schemas/post.list.query.schema";
import { PostCreateSchema } from "@honeycomb/validation/post/schemas/post.create.schema";
import { PostUpdateSchema } from "@honeycomb/validation/post/schemas/post.update.schema";
import { UpdateSchema } from "@honeycomb/validation/schemas/update.schema";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";
import * as schema from "@honeycomb/db/src/schema";
import { and, eq, inArray, like, or } from "drizzle-orm";

export const postRouter = router({
  index: publicProcedure
    .input(PostListQuerySchema.default({}))
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
      ) as any;

      // 分类树过滤
      if (categoryId) {
        const allCategories = await ctx.db.tables.category.select({});
        const catList = Tools.sonsTree(allCategories, categoryId);
        const ids = [categoryId, ...catList.map((c: any) => c.id)];
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
        const tags = await ctx.db.tables.tag.select({
          whereExpr: tagWhere as any,
          limit: 1,
        });
        if (!tags.length) {
          return { list: [], total: 0 };
        }
        const tagId = tags[0].id as string;
        const idLike = `%${tagId}%`;
        const tagClause = or(
          like(schema.post.galleryStyleIds as any, idLike),
          like(schema.post.movieActorIds as any, idLike),
          like(schema.post.movieStyleIds as any, idLike),
          like(schema.post.movieDirectorIds as any, idLike),
        );
        where = where ? and(where, tagClause) : tagClause;
      }

      // 作者名过滤 -> 查 user 再比对 authorId
      if (userName) {
        const users = await ctx.db.tables.user.select({
          name: userName as string,
        });
        if (!users.length) return { list: [], total: 0 };
        const authorClause = eq(schema.post.authorId, users[0].id);
        where = where ? and(where, authorClause) : authorClause;
      }

      const list = await ctx.db.tables.post.select({
        whereExpr: where as any,
        orderBy: { field: sortField, direction: sortOrder },
        limit,
        offset: (page - 1) * limit,
      });

      // 批量加载关联数据以模拟 include
      const categoryIds = Array.from(
        new Set(list.map((p: any) => p.categoryId).filter(Boolean)),
      );
      const authorIds = Array.from(
        new Set(list.map((p: any) => p.authorId).filter(Boolean)),
      );
      const coverIds = Array.from(
        new Set(list.map((p: any) => p.coverId).filter(Boolean)),
      );
      const mediaIds = Array.from(
        new Set(list.flatMap((p: any) => p.mediaId || [])),
      ).filter(Boolean);

      const [categories, authors, covers, mediaList] = await Promise.all([
        categoryIds.length
          ? ctx.db.tables.category.select({
              whereExpr: inArray(schema.category.id, categoryIds),
            })
          : Promise.resolve([] as any[]),
        authorIds.length
          ? ctx.db.tables.user.select({
              whereExpr: inArray(schema.user.id, authorIds),
            })
          : Promise.resolve([] as any[]),
        coverIds.length
          ? ctx.db.tables.media.select({
              whereExpr: inArray(schema.media.id, coverIds),
            })
          : Promise.resolve([] as any[]),
        mediaIds.length
          ? await ctx.db.tables.media.select({
              whereExpr: inArray(schema.media.id, mediaIds),
            })
          : [],
      ]);
      const categoryMap = Object.fromEntries(
        categories.map((c: any) => [c.id, c]),
      );
      const authorMap = Object.fromEntries(authors.map((u: any) => [u.id, u]));
      const coverMap = Object.fromEntries(covers.map((m: any) => [m.id, m]));
      const mediaMap = Object.fromEntries(mediaList.map((m: any) => [m.id, m]));

      const mapped = list.map((item: any) => {
        const { content: _content, ...rest } = item;
        return {
          ...rest,
          category: item.categoryId
            ? (categoryMap[item.categoryId] ?? null)
            : null,
          author: item.authorId ? (authorMap[item.authorId] ?? null) : null,
          cover: item.coverId ? (coverMap[item.coverId] ?? null) : null,
          media: item.mediaId ? (mediaMap[item.mediaId] ?? null) : null,
        } as any;
      });

      const count = await ctx.db.tables.post.count(undefined, where as any);

      return { list: mapped, total: count };
    }),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .output(z.any())
    .query(async ({ input, ctx }) => {
      const result = await ctx.db.tables.post.select({
        id: input.id as string,
      });
      const item = result[0] as any;
      if (!item) return null;
      const [category, author, cover] = await Promise.all([
        item.categoryId
          ? ctx.db.tables.category.select({ id: item.categoryId as string })
          : Promise.resolve([] as any[]),
        item.authorId
          ? ctx.db.tables.user.select({ id: item.authorId as string })
          : Promise.resolve([] as any[]),
        item.coverId
          ? ctx.db.tables.media.select({ id: item.coverId as string })
          : Promise.resolve([] as any[]),
      ]);
      const c = category[0] as any;
      const a = author[0] as any;
      const m = cover[0] as any;
      return {
        ...item,
        category: c ? { id: c.id, title: c.title } : null,
        author: a ? { id: a.id, name: a.name } : null,
        cover: m ? { id: m.id, url: m.url, color: m.color } : null,
      } as any;
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
    .input(PostCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      await ctx.db.tables.post.insert({ ...(input as any), authorId } as any);
      return { ...(input as any), authorId } as any;
    }),

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.tables.post.deleteByIds(input.ids as string[]);
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(UpdateSchema(PostUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input as any;
      await ctx.db.tables.post.update(data as any, { id });
      return { id, ...data };
    }),
});
