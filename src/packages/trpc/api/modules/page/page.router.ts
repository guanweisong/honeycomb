import {
  protectedProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { PageListQuerySchema } from "@/packages/trpc/api/modules/page/schemas/page.list.query.schema";
import { PageInsertSchema } from "@/packages/trpc/api/modules/page/schemas/page.insert.schema";
import { PageUpdateSchema } from "@/packages/trpc/api/modules/page/schemas/page.update.schema";
import { z } from "zod";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import * as schema from "@/packages/db/schema";
import { eq, inArray, sql, InferInsertModel } from "drizzle-orm";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { sanitizeRichText } from "@/packages/trpc/api/utils/sanitizeHtml";
import {
  getPageAuthorById,
  getPageDetail,
  getPageList,
} from "@/packages/trpc/api/modules/page/page.service";

/**
 * 独立页面相关的 tRPC 路由。
 */
export const pageRouter = createTRPCRouter({
  /**
   * 查询独立页面列表（支持分页、筛选、排序）。
   * @param {PageListQuerySchema} input - 查询参数。
   * @returns {Promise<{ list: object[], total: number }>} 返回一个包含页面列表（已附加作者信息）和总记录数的对象。
   */
  index: publicProcedure
    .input(PageListQuerySchema)
    .query(async ({ input, ctx }) => getPageList(ctx.db, input)),

  /**
   * 获取单个独立页面的详细信息。
   * @param {{ id: string }} input - 包含页面 ID 的对象。
   * @returns {Promise<object | null>} 返回包含页面、作者和内容中图片信息的完整对象，如果找不到则返回 null。
   *
   * 工作流程：
   * 1. 根据 ID 查询页面。
   * 2. 如果页面存在，则根据 `authorId` 关联查询作者信息。
   * 4. 根据提取到的 URL 在 `media` 表中查询对应的媒体文件信息。
   * 5. 将作者信息和内容中的图片信息附加到最终结果中返回。
   */
  detail: publicProcedure
    .input(z.object({ id: IdSchema }))
    .query(async ({ input, ctx }) => getPageDetail(ctx.db, input.id as string)),

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
          content: {
            en: sanitizeRichText(input.content.en),
            zh: sanitizeRichText(input.content.zh),
          },
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
      const pages = await ctx.db
        .select({ id: schema.page.id })
        .from(schema.page)
        .where(inArray(schema.page.id, input.ids as string[]));
      await ctx.db
        .delete(schema.page)
        .where(inArray(schema.page.id, input.ids as string[]));
      for (const page of pages) {
      }
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
      const nextValues: Partial<InferInsertModel<typeof schema.page>> = {
        ...rest,
      };
      if (rest.content) {
        nextValues.content = {
          en: sanitizeRichText(rest.content.en),
          zh: sanitizeRichText(rest.content.zh),
        };
      }
      const [updatedPage] = await ctx.db
        .update(schema.page)
        .set(nextValues)
        .where(eq(schema.page.id, id))
        .returning();

      const author = updatedPage.authorId
        ? await getPageAuthorById(ctx.db, updatedPage.authorId)
        : null;

      return { ...updatedPage, author };
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
