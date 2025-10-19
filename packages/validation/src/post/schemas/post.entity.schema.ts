import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { post } from "@honeycomb/db/src/schema";
import { defaultI18nSchema } from "@honeycomb/db/src/i18nField";
import { UserEntitySchema } from "@honeycomb/validation/user/schemas/user.entity.schema";
import { MediaEntitySchema } from "@honeycomb/validation/media/schemas/media.entity.schema";
import { TagEntitySchema } from "@honeycomb/validation/tag/schemas/tag.entity.schema";
import { z } from "zod";

/**
 * 文章实体 Zod schema。
 * 该 schema 基于数据库 'post' 表的查询结果生成，并进行了扩展以包含关联数据和国际化字段。
 *
 * 扩展内容：
 * - `title`, `quoteContent`, `quoteAuthor`, `excerpt`: 这些字段被定义为国际化 (i18n) 结构。
 * - `author`: 字段被扩展为完整的 `UserEntitySchema`，代表关联的作者信息。
 * - `cover`: 字段被扩展为完整的 `MediaEntitySchema`，代表关联的封面图信息。
 * - `movieDirectors`: 字段被扩展为完整的 `TagEntitySchema`数组，代表关联的标签
 * - `movieActors`: 字段被扩展为完整的 `TagEntitySchema`数组，代表关联的标签
 * - `movieStyles`: 字段被扩展为完整的 `TagEntitySchema`数组，代表关联的标签
 * - `galleryStyles`: 字段被扩展为完整的 `TagEntitySchema`数组，代表关联的标签
 */
export const PostEntitySchema = createSelectSchema(post).extend({
  title: defaultI18nSchema,
  quoteContent: defaultI18nSchema,
  quoteAuthor: defaultI18nSchema,
  excerpt: defaultI18nSchema,
  author: UserEntitySchema,
  cover: MediaEntitySchema,
  movieDirectors: z.array(TagEntitySchema),
  movieActors: z.array(TagEntitySchema),
  movieStyles: z.array(TagEntitySchema),
  galleryStyles: z.array(TagEntitySchema),
});

/**
 * 文章实体的 TypeScript 类型。
 * 这是从 `PostEntitySchema` 推断出的包含完整关联数据的纯净 TypeScript 类型。
 */
export type PostEntity = CleanZod<typeof PostEntitySchema>;
