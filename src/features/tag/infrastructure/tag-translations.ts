import type { I18n } from "@/packages/domain/localization/i18n";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import { assembleRequiredLocalizedField } from "@/packages/infrastructure/db/translation-values";
import type * as schema from "@/packages/infrastructure/db/schema";

export type TagTranslationRow = typeof schema.tagTranslation.$inferSelect;

export function toTagTranslationRows(tagId: string, name: I18n): TagTranslationRow[] {
  return supportedLanguages.map((locale) => ({ tagId, locale, name: name[locale] }));
}

export function groupTagTranslations(rows: readonly TagTranslationRow[]) {
  const grouped = new Map<string, TagTranslationRow[]>();
  for (const row of rows) {
    const values = grouped.get(row.tagId) ?? [];
    values.push(row);
    grouped.set(row.tagId, values);
  }
  return new Map(
    [...grouped].map(([id, values]) => [
      id,
      assembleRequiredLocalizedField(values, (row) => row.name),
    ]),
  );
}
