import type { I18n } from "@/packages/domain/localization/i18n";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import { assembleRequiredLocalizedField } from "@/packages/infrastructure/db/translation-values";
import type * as schema from "@/packages/infrastructure/db/schema";

export type CategoryTranslationRow = typeof schema.categoryTranslation.$inferSelect;

export function toCategoryTranslationRows(
  categoryId: string,
  title: I18n,
  description: I18n,
): CategoryTranslationRow[] {
  return supportedLanguages.map((locale) => ({
    categoryId,
    locale,
    title: title[locale],
    description: description[locale],
  }));
}

export function groupCategoryTranslations(rows: readonly CategoryTranslationRow[]) {
  const grouped = new Map<string, CategoryTranslationRow[]>();
  for (const row of rows) {
    const values = grouped.get(row.categoryId) ?? [];
    values.push(row);
    grouped.set(row.categoryId, values);
  }
  return new Map(
    [...grouped].map(([id, values]) => [
      id,
      {
        title: assembleRequiredLocalizedField(values, (row) => row.title),
        description: assembleRequiredLocalizedField(values, (row) => row.description),
      },
    ]),
  );
}
