import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  queryString,
  QueryStringArraySchema,
} from "@/lib/validation/query.string.schema";
import { requiredString } from "@/lib/validation/validation";
import { z } from "zod";
import { PostStatus } from "@/features/post/post-status";
import { PostType } from "@/features/post/post-type";
import { EnableStatus } from "@/lib/validation/enable-status";
import { IdSchema } from "@/lib/validation/id.schema";
import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";

const OptionalI18nSchema = z
  .strictObject({
    en: z.string().nullish(),
    zh: z.string().nullish(),
  })
  .nullable()
  .optional();

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

const relationIds = z
  .array(IdSchema)
  .max(MAX_BATCH_SIZE)
  .transform((ids) => [...new Set(ids)]);
export const PostRelationPatchSchema = z.strictObject({
  movieActorIds: relationIds.optional(),
  movieDirectorIds: relationIds.optional(),
  movieStyleIds: relationIds.optional(),
  galleryStyleIds: relationIds.optional(),
});
export const PostInsertSchema = PostFieldsSchema.extend(
  PostRelationPatchSchema.shape,
)
  .extend({
    creationToken: z.uuid(),
  })
  .strict();
const version = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const PostUpdateSchema = PostFieldsSchema.partial()
  .extend(PostRelationPatchSchema.shape)
  .extend({
    id: IdSchema,
    expectedVersion: version,
    removeLocales: z
      .array(z.enum(["en", "zh"]))
      .max(2)
      .refine(
        (locales) => new Set(locales).size === locales.length,
        "删除语言不能重复",
      )
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.removeLocales ?? []).every((locale) =>
        [
          value.title,
          value.content,
          value.excerpt,
          value.quoteAuthor,
          value.quoteContent,
          value.galleryLocation,
        ].every(
          (field) =>
            field !== null &&
            (field === undefined || !Object.hasOwn(field, locale)),
        ),
      ),
    "不能同时修改和删除同一语言",
  )
  .refine(
    (value) =>
      Object.entries(value).some(
        ([key, field]) =>
          key !== "id" && key !== "expectedVersion" && field !== undefined,
      ),
    "至少修改一个字段",
  );
export const PostDeleteSchema = z.strictObject({
  items: z
    .array(z.strictObject({ id: IdSchema, expectedVersion: version }))
    .min(1)
    .max(MAX_BATCH_SIZE)
    .refine(
      (items) => new Set(items.map(({ id }) => id)).size === items.length,
      "文章不能重复",
    ),
});
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
