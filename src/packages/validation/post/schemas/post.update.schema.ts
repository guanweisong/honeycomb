import { createUpdateSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";

/**
 * 更新文章时的数据验证 schema。
 * 1. 使用 `createUpdateSchema` 创建基础 schema，其中除 'id' 外的字段默认为可选。
 * 2. 使用 `.pick()` 方法指定了所有允许更新的字段以及用于识别记录的 'id'。
 *    - **通用字段**: title, content, excerpt, status, type, categoryId, coverId, commentStatus
 *    - **引言字段**: quoteAuthor, quoteContent
 *    - **电影类型文章字段**: movieTime, movieStyleIds, movieActorIds, movieDirectorIds
 *    - **图库类型文章字段**: galleryLocation, galleryStyleIds, galleryTime
 * 3. 使用 `.required({ id: true })` 强制要求 'id' 字段必须存在，以确保能定位到要更新的文章。
 */
export const PostUpdateSchema = createUpdateSchema(schema.post)
  .pick({
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
    id: true,
  })
  .required({
    id: true,
  });
