import type { NullableLocalizedInput } from "@/lib/i18n/i18n";
import { supportedLanguages } from "@/lib/i18n/i18n";
import {
  assembleLocalizedField,
  hasTranslationValues,
  patchLocalizedValue,
} from "@/lib/db/translation-values";
import type * as schema from "@/lib/db/schema";
import { sanitizeRichText } from "@/lib/security/sanitize-html";

export type PostTranslationRow = typeof schema.postTranslation.$inferSelect;
export type PostTranslationFields = Omit<
  PostTranslationRow,
  "postId" | "locale"
>;

export type PostTranslationInput = {
  title?: NullableLocalizedInput;
  content?: NullableLocalizedInput;
  excerpt?: NullableLocalizedInput;
  galleryLocation?: NullableLocalizedInput;
  quoteAuthor?: NullableLocalizedInput;
  quoteContent?: NullableLocalizedInput;
};

function sanitizeLocalizedContent(
  value: NullableLocalizedInput | undefined,
): NullableLocalizedInput | undefined {
  if (value == null) return value;
  return Object.fromEntries(
    supportedLanguages.flatMap((locale) =>
      Object.hasOwn(value, locale)
        ? [
            [
              locale,
              value[locale] == null
                ? value[locale]
                : sanitizeRichText(value[locale]),
            ],
          ]
        : [],
    ),
  );
}

export function sanitizePostTranslationInput(
  input: PostTranslationInput,
): PostTranslationInput {
  return { ...input, content: sanitizeLocalizedContent(input.content) };
}

export function toPostTranslationRows(
  postId: string,
  input: PostTranslationInput,
): PostTranslationRow[] {
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
      content: patchLocalizedValue(
        input.content,
        locale,
        current?.content ?? null,
      ),
      excerpt: patchLocalizedValue(
        input.excerpt,
        locale,
        current?.excerpt ?? null,
      ),
      galleryLocation: patchLocalizedValue(
        input.galleryLocation,
        locale,
        current?.galleryLocation ?? null,
      ),
      quoteAuthor: patchLocalizedValue(
        input.quoteAuthor,
        locale,
        current?.quoteAuthor ?? null,
      ),
      quoteContent: patchLocalizedValue(
        input.quoteContent,
        locale,
        current?.quoteContent ?? null,
      ),
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
        galleryLocation: assembleLocalizedField(
          values,
          (row) => row.galleryLocation,
        ),
        quoteAuthor: assembleLocalizedField(values, (row) => row.quoteAuthor),
        quoteContent: assembleLocalizedField(values, (row) => row.quoteContent),
      },
    ]),
  );
}
