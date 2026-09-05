import { z } from "zod";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { PartialLocalizedTextSchema } from "@/packages/domain/localization/i18n";
import { MediaRecordSchema, TagRecordSchema } from "@/features/contracts";

const localized = PartialLocalizedTextSchema.nullable();
const timestamps = {
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
};

/** 分类关联快照，保持既有部分语言展示语义。 */
export const PostCategoryRecordSchema = z.object({
  id: z.string(),
  title: localized,
  description: localized,
  parent: z.string().nullable(),
  status: z.string(),
  path: z.string(),
  ...timestamps,
});
/** 关联快照不冒充已验证角色的认证用户。 */
export const PostAuthorRecordSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  level: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  ...timestamps,
});

/** Repository 返回类型与缓存解码共用的唯一文章读取契约。 */
export const PostWithRelationsSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  categoryId: z.string(),
  title: localized,
  content: localized,
  excerpt: localized,
  status: z.enum(PostStatus),
  type: z.enum(PostType),
  commentStatus: z.enum(EnableStatus),
  coverId: z.string().nullable(),
  quoteAuthor: localized,
  quoteContent: localized,
  movieTime: z.string().nullable(),
  galleryLocation: localized,
  galleryTime: z.string().nullable(),
  views: z.number().nullable(),
  ...timestamps,
  category: PostCategoryRecordSchema.nullish(),
  author: PostAuthorRecordSchema.nullish(),
  cover: MediaRecordSchema.nullish(),
  movieActors: z.array(TagRecordSchema),
  movieDirectors: z.array(TagRecordSchema),
  movieStyles: z.array(TagRecordSchema),
  galleryStyles: z.array(TagRecordSchema),
});
export const PostListResultSchema = z.object({
  list: z.array(PostWithRelationsSchema),
  total: z.number(),
});
