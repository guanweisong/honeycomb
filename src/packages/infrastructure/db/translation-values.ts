import {
  I18nSchema,
  type I18n,
  type MultiLangEnum,
} from "@/packages/domain/localization/i18n";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";

type TranslationRow = { locale: MultiLangEnum };

export function assembleLocalizedField<Row extends TranslationRow>(
  rows: readonly Row[],
  read: (row: Row) => string | null,
): MultiLang | null {
  const value: MultiLang = {};
  for (const row of rows) {
    const localized = read(row);
    if (localized !== null) value[row.locale] = localized;
  }
  return hasTranslationValues(Object.values(value)) ? value : null;
}

export function hasTranslationValues(
  values: readonly (string | null | undefined)[],
): boolean {
  return values.some((value) => value !== null && value !== undefined);
}

export function assembleRequiredLocalizedField<Row extends TranslationRow>(
  rows: readonly Row[],
  read: (row: Row) => string | null,
): I18n | null {
  const result = I18nSchema.safeParse(assembleLocalizedField(rows, read));
  return result.success ? result.data : null;
}
