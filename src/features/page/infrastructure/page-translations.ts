import type { I18n } from "@/packages/domain/localization/i18n";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import { assembleRequiredLocalizedField } from "@/packages/infrastructure/db/translation-values";
import type * as schema from "@/packages/infrastructure/db/schema";

export type PageTranslationRow = typeof schema.pageTranslation.$inferSelect;

export function toPageTranslationRows(pageId: string, title: I18n, content: I18n): PageTranslationRow[] {
  return supportedLanguages.map((locale) => ({ pageId, locale, title: title[locale], content: content[locale] }));
}

export function groupPageTranslations(rows: readonly PageTranslationRow[]) {
  const grouped = new Map<string, PageTranslationRow[]>();
  for (const row of rows) {
    const values = grouped.get(row.pageId) ?? [];
    values.push(row);
    grouped.set(row.pageId, values);
  }
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
