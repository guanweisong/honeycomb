import type { InferInsertModel } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { I18n } from "@/packages/domain/localization/i18n";
import type { PostCreateCommand, PostI18nInput, PostUpdateCommand } from "../application/repository";
export type { PostCreateCommand, PostUpdateCommand } from "../application/repository";
import { sanitizeOptionalI18nHtml } from "@/packages/infrastructure/security/sanitize-html";
type PostInsertValues = InferInsertModel<typeof schema.post>;
function normalize(value: PostI18nInput | undefined): I18n | null | undefined { if (value == null) return value; return { en: value.en ?? "", zh: value.zh ?? "" }; }
/** 将文章输入转换为可持久化结构。 */
export function toPostInsertValues(input: PostCreateCommand, authorId: string): PostInsertValues {
  return {
    authorId,
    categoryId: input.categoryId,
    status: input.status,
    type: input.type,
    coverId: input.coverId,
    commentStatus: input.commentStatus,
    movieTime: input.movieTime,
    galleryTime: input.galleryTime,
    galleryLocation: normalize(input.galleryLocation),
    title: normalize(input.title),
    content: sanitizeOptionalI18nHtml(normalize(input.content)),
    excerpt: normalize(input.excerpt),
    quoteAuthor: normalize(input.quoteAuthor),
    quoteContent: normalize(input.quoteContent),
  } satisfies PostInsertValues;
}
/** 将文章更新输入转换为可持久化结构。 */
export function toPostUpdateValues(input: Omit<PostUpdateCommand, "id">): Partial<PostInsertValues> {
  return {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.coverId !== undefined ? { coverId: input.coverId } : {}),
    ...(input.commentStatus !== undefined ? { commentStatus: input.commentStatus } : {}),
    ...(input.movieTime !== undefined ? { movieTime: input.movieTime } : {}),
    ...(input.galleryTime !== undefined ? { galleryTime: input.galleryTime } : {}),
    ...(input.galleryLocation !== undefined ? { galleryLocation: normalize(input.galleryLocation) } : {}),
    ...(input.title !== undefined ? { title: normalize(input.title) } : {}),
    ...(input.content !== undefined ? { content: sanitizeOptionalI18nHtml(normalize(input.content)) } : {}),
    ...(input.excerpt !== undefined ? { excerpt: normalize(input.excerpt) } : {}),
    ...(input.quoteAuthor !== undefined ? { quoteAuthor: normalize(input.quoteAuthor) } : {}),
    ...(input.quoteContent !== undefined ? { quoteContent: normalize(input.quoteContent) } : {}),
  } satisfies Partial<PostInsertValues>;
}
