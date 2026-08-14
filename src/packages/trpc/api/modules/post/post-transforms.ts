import type { InferInsertModel } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { I18n } from "@/packages/trpc/api/schemas/i18n.schema";
import type { PostInsert } from "./schemas/post.insert.schema";
import type { PostUpdate } from "./schemas/post.update.schema";
import { sanitizeOptionalI18nHtml } from "@/packages/trpc/api/utils/sanitize-html";

type PostInsertValues = InferInsertModel<typeof schema.post>;
type OptionalI18nInput =
  | Partial<Record<keyof I18n, string | null>>
  | null
  | undefined;

function normalizeOptionalI18n(value: unknown): I18n | null | undefined {
  if (value == null) return value;
  if (typeof value !== "object") return undefined;

  const item = value as OptionalI18nInput;
  return { en: item?.en ?? "", zh: item?.zh ?? "" };
}

/** 将文章输入转换为数据库可持久化的结构，并统一清理多语言 HTML。 */
export function toPostInsertValues(
  input: PostInsert,
  authorId: string,
): PostInsertValues {
  return {
    ...input,
    authorId,
    galleryLocation: normalizeOptionalI18n(input.galleryLocation),
    title: normalizeOptionalI18n(input.title),
    content: sanitizeOptionalI18nHtml(normalizeOptionalI18n(input.content)),
    excerpt: normalizeOptionalI18n(input.excerpt),
    quoteAuthor: normalizeOptionalI18n(input.quoteAuthor),
    quoteContent: normalizeOptionalI18n(input.quoteContent),
  };
}

/** 将文章更新输入转换为数据库更新结构，并统一清理多语言 HTML。 */
export function toPostUpdateValues(
  input: Omit<PostUpdate, "id">,
): Partial<PostInsertValues> {
  return {
    ...input,
    galleryLocation: normalizeOptionalI18n(input.galleryLocation),
    title: normalizeOptionalI18n(input.title),
    content: sanitizeOptionalI18nHtml(normalizeOptionalI18n(input.content)),
    excerpt: normalizeOptionalI18n(input.excerpt),
    quoteAuthor: normalizeOptionalI18n(input.quoteAuthor),
    quoteContent: normalizeOptionalI18n(input.quoteContent),
  };
}
