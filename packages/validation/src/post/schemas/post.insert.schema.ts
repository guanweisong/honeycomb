import { createInsertSchema } from "drizzle-zod";
import { post } from "@honeycomb/db/src/schema";

/**
 * 新增文章时的数据验证 schema。
 * 该 schema 基于数据库 'post' 表的插入操作 schema 生成 (drizzle-zod)。
 * 使用 `.pick()` 方法精确指定了创建新文章时允许传入的所有字段。
 *
 * 包含的字段可以分为几类：
 * - **通用字段**: title, content, excerpt, status, type, categoryId, coverId, commentStatus
 * - **引言字段**: quoteAuthor, quoteContent
 * - **电影类型文章字段**: movieTime, movieStyleIds, movieActorIds, movieDirectorIds
 * - **图库类型文章字段**: galleryLocation, galleryStyleIds, galleryTime
 */
export const PostInsertSchema = createInsertSchema(post).pick({
  title: true,
  content: true,
  excerpt: true,
  status: true,
  type: true,
  categoryId: true,
  coverId: true,
  commentStatus: true,
  quoteAuthor: true,
  quoteContent: true,
  movieTime: true,
  movieStyleIds: true,
  movieActorIds: true,
  movieDirectorIds: true,
  galleryLocation: true,
  galleryStyleIds: true,
  galleryTime: true,
});
