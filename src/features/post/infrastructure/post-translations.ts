import type { PostI18nInput } from "../application/repository";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import { assembleLocalizedField, hasTranslationValues } from "@/packages/infrastructure/db/translation-values";
import type * as schema from "@/packages/infrastructure/db/schema";
import { sanitizeRichText } from "@/packages/infrastructure/security/sanitize-html";

export type PostTranslationRow = typeof schema.postTranslation.$inferSelect;
export type PostTranslationFields = Omit<PostTranslationRow, "postId" | "locale">;

export type PostTranslationInput = {
  title?: PostI18nInput;
  content?: PostI18nInput;
  excerpt?: PostI18nInput;
  galleryLocation?: PostI18nInput;
  quoteAuthor?: PostI18nInput;
  quoteContent?: PostI18nInput;
};

function sanitizeLocalizedContent(value: PostI18nInput | undefined): PostI18nInput | undefined {
  if (value == null) return value;
  return Object.fromEntries(
    supportedLanguages.flatMap((locale) =>
      Object.hasOwn(value, locale)
        ? [[locale, value[locale] == null ? value[locale] : sanitizeRichText(value[locale])]]
        : [],
    ),
  );
}

export function sanitizePostTranslationInput(input: PostTranslationInput): PostTranslationInput {
  return { ...input, content: sanitizeLocalizedContent(input.content) };
}

export function toPostTranslationRows(postId: string, input: PostTranslationInput): PostTranslationRow[] {
  return supportedLanguages.flatMap((locale) => {
    const fields: PostTranslationFields = {
      title: input.title?.[locale] ?? null,
      content: input.content?.[locale] ?? null,
      excerpt: input.excerpt?.[locale] ?? null,
      galleryLocation: input.galleryLocation?.[locale] ?? null,
      quoteAuthor: input.quoteAuthor?.[locale] ?? null,
      quoteContent: input.quoteContent?.[locale] ?? null,
    };
    return hasTranslationValues(Object.values(fields))
      ? [{ postId, locale, ...fields }]
      : [];
  });
}

function patchLocalizedValue(
  patch: PostI18nInput | undefined,
  locale: PostTranslationRow["locale"],
  current: string | null,
): string | null {
  if (patch === undefined) return current;
  if (patch === null) return null;
  return Object.hasOwn(patch, locale) ? (patch[locale] ?? null) : current;
}

export function patchPostTranslationRows(
  postId: string,
  currentRows: readonly PostTranslationRow[],
  input: PostTranslationInput,
): PostTranslationRow[] {
  const currentByLocale = new Map(currentRows.map((row) => [row.locale, row]));
  return supportedLanguages.flatMap((locale) => {
    const current = currentByLocale.get(locale);
    const fields: PostTranslationFields = {
      title: patchLocalizedValue(input.title, locale, current?.title ?? null),
      content: patchLocalizedValue(input.content, locale, current?.content ?? null),
      excerpt: patchLocalizedValue(input.excerpt, locale, current?.excerpt ?? null),
      galleryLocation: patchLocalizedValue(
        input.galleryLocation,
        locale,
        current?.galleryLocation ?? null,
      ),
      quoteAuthor: patchLocalizedValue(input.quoteAuthor, locale, current?.quoteAuthor ?? null),
      quoteContent: patchLocalizedValue(input.quoteContent, locale, current?.quoteContent ?? null),
    };
    return hasTranslationValues(Object.values(fields))
      ? [{ postId, locale, ...fields }]
      : [];
  });
}

export function groupPostTranslations(rows: readonly PostTranslationRow[]) {
  const grouped = new Map<string, PostTranslationRow[]>();
  for (const row of rows) {
    const values = grouped.get(row.postId) ?? [];
    values.push(row);
    grouped.set(row.postId, values);
  }
  return new Map(
    [...grouped].map(([id, values]) => [
      id,
      {
        title: assembleLocalizedField(values, (row) => row.title),
        content: assembleLocalizedField(values, (row) => row.content),
        excerpt: assembleLocalizedField(values, (row) => row.excerpt),
        galleryLocation: assembleLocalizedField(values, (row) => row.galleryLocation),
        quoteAuthor: assembleLocalizedField(values, (row) => row.quoteAuthor),
        quoteContent: assembleLocalizedField(values, (row) => row.quoteContent),
      },
    ]),
  );
}
