import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  queryString,
  QueryStringArraySchema,
} from "@/lib/validation/query.string.schema";
import { NullableLocalizedInputSchema } from "@/lib/i18n/i18n";
const OptionalI18nSchema = NullableLocalizedInputSchema.optional();
import { requiredString, type CleanZod } from "@/lib/validation/validation";
import { z } from "zod";
import { PostStatus } from "@/features/post/post-status";
import { PostType } from "@/features/post/post-type";
import { EnableStatus } from "@/lib/validation/enable-status";
import { IdSchema } from "@/lib/validation/id.schema";
import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";

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

export type PostFields = z.output<typeof PostFieldsSchema>;
const relationIds = z
  .array(IdSchema)
  .max(MAX_BATCH_SIZE)
  .transform((ids) => [...new Set(ids)]);
export const PostRelationPatchSchema = z.object({
  movieActorIds: relationIds.optional(),
  movieDirectorIds: relationIds.optional(),
  movieStyleIds: relationIds.optional(),
  galleryStyleIds: relationIds.optional(),
});
export type PostRelationPatch = z.output<typeof PostRelationPatchSchema>;
export const PostInsertSchema = PostFieldsSchema.extend(
  PostRelationPatchSchema.shape,
).extend({
  creationToken: z.uuid(),
});
export type PostInsert = z.output<typeof PostInsertSchema>;
const version = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const PostUpdateSchema = PostFieldsSchema.partial()
  .extend(PostRelationPatchSchema.shape)
  .extend({ id: IdSchema, expectedVersion: version })
  .refine(
    (value) =>
      Object.entries(value).some(
        ([key, field]) =>
          key !== "id" && key !== "expectedVersion" && field !== undefined,
      ),
    "至少修改一个字段",
  );
export type PostUpdate = z.output<typeof PostUpdateSchema>;
export const PostDeleteSchema = z.object({
  items: z
    .array(z.object({ id: IdSchema, expectedVersion: version }))
    .min(1)
    .max(MAX_BATCH_SIZE)
    .refine(
      (items) => new Set(items.map(({ id }) => id)).size === items.length,
      "文章不能重复",
    ),
});
export type PostDelete = z.output<typeof PostDeleteSchema>;
export const PostCreationResultInputSchema = z.object({
  creationToken: z.uuid(),
});

/**
 * 获取文章列表时的查询参数验证 schema。
 */
export const PostListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  content: queryString(),
  status: QueryStringArraySchema,
  type: QueryStringArraySchema,
  categoryId: queryString(),
  tagId: queryString(),
  authorId: queryString(),
}).partial();

/**
 * 文章列表查询参数的 TypeScript 类型。
 * 从 `PostListQuerySchema` 推断而来。
 */
export type PostListQueryInput = CleanZod<typeof PostListQuerySchema>;
