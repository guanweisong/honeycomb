import type { I18n } from "@/lib/i18n/i18n";
import { supportedLanguages } from "@/lib/i18n/i18n";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
import type * as schema from "@/lib/db/schema";

export type PageTranslationRow = typeof schema.pageTranslation.$inferSelect;

export function toPageTranslationRows(
  pageId: string,
  title: I18n,
  content: I18n,
): PageTranslationRow[] {
  return supportedLanguages.map((locale) => ({
    pageId,
    locale,
    title: title[locale],
    content: content[locale],
  }));
}

export function groupPageTranslations(rows: readonly PageTranslationRow[]) {
  const grouped = Map.groupBy(rows, (row) => row.pageId);
  return new Map(
    [...grouped].map(([id, values]) => [
      id,
      {
        title: assembleRequiredLocalizedField(values, (row) => row.title),
        content: assembleRequiredLocalizedField(values, (row) => row.content),
      },
    ]),
  );
}
