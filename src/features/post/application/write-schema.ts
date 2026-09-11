import { NullableLocalizedInputSchema } from "@/packages/domain/localization/i18n";
const OptionalI18nSchema = NullableLocalizedInputSchema.optional();
import { requiredString } from "@/packages/application/validation";
import { z } from "zod";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { TagType } from "@/packages/domain/content/tag";
import { MAX_BATCH_SIZE } from "@/packages/application/resource-limits";

export const PostTagUpdateSchema = z.object({
  postId: IdSchema,
  tagIds: z.array(IdSchema).max(MAX_BATCH_SIZE).transform((ids) => [...new Set(ids)]),
  type: z.enum(TagType),
});
export type PostTagUpdate = z.output<typeof PostTagUpdateSchema>;

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
  status: z.enum(PostStatus).optional(),
  type: z.enum(PostType).optional(),
  categoryId: requiredString("分类目录不能为空"),
  coverId: z.string().nullable().optional(),
  commentStatus: z.enum(EnableStatus).optional(),
  movieTime: z.string().nullable().optional(),
  galleryTime: z.string().nullable().optional(),
  title: OptionalI18nSchema,
  content: OptionalI18nSchema,
  excerpt: OptionalI18nSchema,
  quoteAuthor: OptionalI18nSchema,
  quoteContent: OptionalI18nSchema,
  galleryLocation: OptionalI18nSchema,
});

export type PostInsert = z.output<typeof PostInsertSchema>;
