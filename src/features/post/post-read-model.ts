import { z } from "zod";
import { PostStatus } from "@/features/post/post-status";
import { PostType } from "@/features/post/post-type";
import { EnableStatus } from "@/lib/validation/enable-status";
import { PartialLocalizedTextSchema } from "@/lib/i18n/i18n";
import { MediaRecordSchema } from "@/features/media/schema";
import { TagRecordSchema } from "@/features/tag/schema";

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
  status: z.enum(EnableStatus),
  path: z.string(),
  ...timestamps,
});
/** 关联快照不冒充已验证角色的认证用户。 */
export const PostAuthorRecordSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

/** 文章查询与缓存解码共用的读取结构。 */
export const PostWithRelationsSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  version: z.number().int().nonnegative(),
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

/** 公开卡片及 sitemap 只需要这些字段，不传输正文和完整关联。 */
export const PublicPostListItemSchema = PostWithRelationsSchema.pick({
  id: true,
  type: true,
  title: true,
  excerpt: true,
  movieTime: true,
  quoteContent: true,
  quoteAuthor: true,
  updatedAt: true,
}).extend({
  cover: MediaRecordSchema.pick({
    url: true,
    width: true,
    height: true,
  }).nullish(),
});
export const PublicPostListResultSchema = PostListResultSchema.extend({
  list: z.array(PublicPostListItemSchema),
});

/** 管理表格只接收展示字段和删除所需的 CAS 版本，不传输正文及媒体/标签关系。 */
export const AdminPostListItemSchema = PostWithRelationsSchema.pick({
  id: true,
  version: true,
  title: true,
  quoteContent: true,
  type: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  views: true,
}).extend({
  category: PostCategoryRecordSchema.pick({ title: true }).nullish(),
  author: PostAuthorRecordSchema.pick({ name: true }).nullish(),
});
export const AdminPostListResultSchema = PostListResultSchema.extend({
  list: z.array(AdminPostListItemSchema),
});
