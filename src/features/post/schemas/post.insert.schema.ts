import { OptionalI18nSchema } from "@/packages/trpc/api/schemas/i18n.schema";
import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { z } from "zod";

/**
 * 新增文章时的数据验证 schema。
 * 该 schema 定义创建文章时允许传入的字段，不依赖数据库表结构。
 *
 * 包含的字段可以分为几类：
 * - **通用字段**: title, content, excerpt, status, type, categoryId, coverId, commentStatus
 * - **引言字段**: quoteAuthor, quoteContent
 * - **电影类型文章字段**: movieTime
 * - **图库类型文章字段**: galleryLocation, galleryTime
 */
export const PostInsertSchema = z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    categoryId: requiredString("分类目录不能为空"),
    coverId: z.string().nullable().optional(),
    commentStatus: z.string().optional(),
    movieTime: z.string().nullable().optional(),
    galleryTime: z.string().nullable().optional(),
    title: OptionalI18nSchema,
    content: OptionalI18nSchema,
    excerpt: OptionalI18nSchema,
    quoteAuthor: OptionalI18nSchema,
    quoteContent: OptionalI18nSchema,
    galleryLocation: OptionalI18nSchema,
  });

export type PostInsert = CleanZod<typeof PostInsertSchema>;
