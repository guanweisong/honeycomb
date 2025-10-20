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
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import { getAllImageLinkFormMarkdown } from "@honeycomb/trpc/server/utils/getAllImageLinkFormMarkdown";
import { MediaEntity } from "@honeycomb/validation/media/schemas/media.entity.schema";
import { UserLevel } from "@honeycomb/types/user/user.level";

/**
 * 独立页面相关的 tRPC 路由。
 */
export const pageRouter = router({
  /**
   * 查询独立页面列表（支持分页、筛选、排序）。
   * @param {PageListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: any[], total: number }>} 返回一个包含页面列表（已附加作者信息）和总记录数的对象。
   */
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

  /**
   * 获取单个独立页面的详细信息。
   * @param {{ id: string }} input - 包含页面 ID 的对象。
   * @returns {Promise<object | null>} 返回包含页面、作者和内容中图片信息的完整对象，如果找不到则返回 null。
   *
   * 工作流程：
   * 1. 根据 ID 查询页面。
   * 2. 如果页面存在，则根据 `authorId` 关联查询作者信息。
   * 3. 使用 `getAllImageLinkFormMarkdown` 从页面内容中提取所有图片 URL。
   * 4. 根据提取到的 URL 在 `media` 表中查询对应的媒体文件信息。
   * 5. 将作者信息和内容中的图片信息附加到最终结果中返回。
   */
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

      return { ...item, author, imagesInContent };
    }),

  /**
   * 创建一个新独立页面。
   * (需要管理员或编辑权限)
   * @param {PageInsertSchema} input - 新页面的数据。
   * @returns {Promise<Page>} 返回新创建的页面对象。
   */
  create: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(PageInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const authorId = ctx.user?.id;
      const [newPage] = await ctx.db
        .insert(schema.page)
        .values({
          ...input,
          authorId,
        } as InferInsertModel<typeof schema.page>)
        .returning();
      return newPage;
    }),

  /**
   * 批量删除独立页面。
   * (需要管理员或编辑权限)
   * @param {DeleteBatchSchema} input - 包含要删除的页面 ID 数组。
   * @returns {Promise<{ success: boolean }>} 返回表示操作成功的对象。
   */
  destroy: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(DeleteBatchSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.page)
        .where(inArray(schema.page.id, input.ids as string[]));
      return { success: true };
    }),

  /**
   * 更新一个独立页面。
   * (需要管理员或编辑权限)
   * @param {PageUpdateSchema} input - 包含要更新的页面 ID 和新数据。
   * @returns {Promise<object>} 返回更新后的页面对象（已附加作者信息）。
   */
  update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
    .input(PageUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const [updatedPage] = await ctx.db
        .update(schema.page)
        .set(rest as Partial<InferInsertModel<typeof schema.page>>)
        .where(eq(schema.page.id, id))
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

  /**
   * 获取指定页面的浏览量。
   * @param {{ id: string }} input - 包含页面 ID 的对象。
   * @returns {Promise<{ views: number }>} 返回包含浏览量的对象。
   */
  getViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ views: schema.page.views })
        .from(schema.page)
        .where(eq(schema.page.id, input.id));
      return result ?? { views: 0 };
    }),

  /**
   * 将指定页面的浏览量加一。
   * 这是一个原子操作，直接在数据库层面执行 `views = views + 1`。
   * @param {{ id: string }} input - 包含页面 ID 的对象。
   * @returns {Promise<{ views: number }>} 返回更新后的浏览量。
   */
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
