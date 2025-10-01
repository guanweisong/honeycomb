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
import { PageListQuerySchema } from "@honeycomb/validation/page/schemas/page.list.query.schema";
import { PageInsertSchema } from "@honeycomb/validation/page/schemas/page.insert.schema";
import { PageUpdateSchema } from "@honeycomb/validation/page/schemas/page.update.schema";
import { z } from "zod";
import { IdSchema } from "@honeycomb/validation/schemas/fields/id.schema";
import * as schema from "@honeycomb/db/src/schema";
import { eq, inArray, sql } from "drizzle-orm";

export const pageRouter = router({
  index: publicProcedure
    .input(PageListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, sortField, sortOrder, title, content, ...rest } =
        input as any;
      const where = buildDrizzleWhere(
        schema.page,
        { ...rest, title, content },
        ["status"],
        { title, content },
      );
      // 使用工具函数构建排序条件
      const orderByClause = buildDrizzleOrderBy(
        schema.page,
        sortField,
        sortOrder as "asc" | "desc",
        "createdAt",
      );

      // 查询分页数据
      const list = await ctx.db
        .select()
        .from(schema.page)
        .where(where)
        .orderBy(orderByClause as any)
        .limit(limit)
        .offset((page - 1) * limit);

      // 获取作者信息
      const authorIds = Array.from(
        new Set(list.map((p: any) => p.authorId).filter(Boolean)),
      );
      let authorMap: Record<string, any> = {};
      if (authorIds.length) {
        const authors = await ctx.db
          .select()
          .from(schema.user)
          .where(inArray(schema.user.id, authorIds as any));
        authorMap = Object.fromEntries(authors.map((u: any) => [u.id, u]));
      }

      // 合并作者信息
      const listWithAuthor = list.map((p: any) => ({
        ...p,
        author: p.authorId ? (authorMap[p.authorId] ?? null) : null,
      }));

      // 查询总数
      const countResult = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.page)
        .where(where);
      const total = Number(countResult[0]?.count) || 0;

      return { list: listWithAuthor, total };
    }),

  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => {
      const [item] = await ctx.db
        .select()
        .from(schema.page)
        .where(eq(schema.page.id, input.id as string));

      if (!item) return null;

      let author: any = null;
      if (item.authorId) {
        const [authorData] = await ctx.db
          .select({
            id: schema.user.id,
            name: schema.user.name,
          })
          .from(schema.user)
          .where(eq(schema.user.id, item.authorId));
        author = authorData || null;
      }

      return { ...item, author };
    }),

  create: protectedProcedure(["ADMIN", "EDITOR"])
    .input(PageInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      const [newPage] = await ctx.db
        .insert(schema.page)
        .values({
          ...input,
          authorId,
        })
        .returning();
      return newPage;
    }),

  destroy: protectedProcedure(["ADMIN", "EDITOR"])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.page)
        .where(inArray(schema.page.id, input.ids as string[]));
      return { success: true };
    }),

  update: protectedProcedure(["ADMIN", "EDITOR"])
    .input(PageUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedPage] = await ctx.db
        .update(schema.page)
        .set(input)
        .where(eq(schema.page.id, input.id))
        .returning();

      let author: any = null;
      if (updatedPage.authorId) {
        const [authorData] = await ctx.db
          .select({
            id: schema.user.id,
            name: schema.user.name,
          })
          .from(schema.user)
          .where(eq(schema.user.id, updatedPage.authorId));
        author = authorData || null;
      }

      return { ...updatedPage, author };
    }),

  getViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ views: schema.page.views })
        .from(schema.page)
        .where(eq(schema.page.id, input.id));
      return result ?? { views: 0 };
    }),

  incrementViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updatedPage] = await ctx.db
        .update(schema.page)
        .set({
          views: sql`${schema.page.views} + 1`,
        })
        .where(eq(schema.page.id, input.id))
        .returning({ views: schema.page.views });

      return updatedPage;
    }),
});
