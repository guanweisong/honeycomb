import { z } from "zod";
import { requiredString } from "@/lib/validation/validation";
import { IdSchema } from "@/lib/validation/id.schema";
import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";
import { EnableStatus } from "@/lib/validation/enable-status";
import { PostStatus } from "../types/post.status";
import { PostType } from "../types/post.type";

const OptionalI18nSchema = z
  .strictObject({
    en: z.string().nullish(),
    zh: z.string().nullish(),
  })
  .nullable()
  .optional();

const relationIds = z
  .array(IdSchema)
  .max(MAX_BATCH_SIZE)
  .transform((ids) => [...new Set(ids)]);

export const PostVersionSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

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
export const PostFieldsSchema = z.object({
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

export const PostRelationPatchSchema = z.strictObject({
  movieActorIds: relationIds.optional(),
  movieDirectorIds: relationIds.optional(),
  movieStyleIds: relationIds.optional(),
  galleryStyleIds: relationIds.optional(),
});
