import type { InferInsertModel } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { I18n } from "@/packages/domain/localization/i18n";
import type { PostCommandInput } from "../application/repository";
export type { PostCommandInput } from "../application/repository";
import { sanitizeOptionalI18nHtml } from "@/packages/infrastructure/security/sanitize-html";
type PostInsertValues = InferInsertModel<typeof schema.post>;
type OptionalI18nInput = Partial<Record<keyof I18n, string | null>> | null | undefined;
function normalize(value: unknown): I18n | null | undefined { if (value == null) return value; if (typeof value !== "object") return undefined; const item = value as OptionalI18nInput; return { en: item?.en ?? "", zh: item?.zh ?? "" }; }
/** 将文章输入转换为可持久化结构。 */
export function toPostInsertValues(input: PostCommandInput, authorId: string): PostInsertValues { return { ...input, authorId, galleryLocation: normalize(input.galleryLocation), title: normalize(input.title), content: sanitizeOptionalI18nHtml(normalize(input.content)), excerpt: normalize(input.excerpt), quoteAuthor: normalize(input.quoteAuthor), quoteContent: normalize(input.quoteContent) } as PostInsertValues; }
/** 将文章更新输入转换为可持久化结构。 */
export function toPostUpdateValues(input: PostCommandInput): Partial<PostInsertValues> { return { ...input, galleryLocation: normalize(input.galleryLocation), title: normalize(input.title), content: sanitizeOptionalI18nHtml(normalize(input.content)), excerpt: normalize(input.excerpt), quoteAuthor: normalize(input.quoteAuthor), quoteContent: normalize(input.quoteContent) }; }
