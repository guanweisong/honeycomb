import {
  supportedLanguages,
  type MultiLangEnum,
  type NullableLocalizedInput,
} from "@/packages/domain/localization/i18n";
import { assembleLocalizedField, hasTranslationValues } from "@/packages/infrastructure/db/translation-values";
import type * as schema from "@/packages/infrastructure/db/schema";
import type { SettingUpdate } from "../application/repository";

export type SettingTranslationRow = typeof schema.settingTranslation.$inferSelect;
export type SettingTranslationFields = Omit<SettingTranslationRow, "settingId" | "locale">;

function patchLocalizedValue(
  patch: NullableLocalizedInput | undefined,
  locale: MultiLangEnum,
  current: string | null,
): string | null {
  if (patch === undefined) return current;
  if (patch === null) return null;
  return Object.hasOwn(patch, locale) ? (patch[locale] ?? null) : current;
}

export function patchSettingTranslationRows(
  settingId: string,
  currentRows: readonly SettingTranslationRow[],
  input: SettingUpdate,
): SettingTranslationRow[] {
  const currentByLocale = new Map(currentRows.map((row) => [row.locale, row]));
  return supportedLanguages.flatMap((locale) => {
    const current = currentByLocale.get(locale);
    const fields: SettingTranslationFields = {
      siteName: patchLocalizedValue(input.siteName, locale, current?.siteName ?? null),
      siteSubName: patchLocalizedValue(input.siteSubName, locale, current?.siteSubName ?? null),
      siteSignature: patchLocalizedValue(input.siteSignature, locale, current?.siteSignature ?? null),
      siteCopyright: patchLocalizedValue(input.siteCopyright, locale, current?.siteCopyright ?? null),
    };
    return hasTranslationValues(Object.values(fields))
      ? [{ settingId, locale, ...fields }]
      : [];
  });
}

export function assembleSettingTranslations(rows: readonly SettingTranslationRow[]) {
  return {
    siteName: assembleLocalizedField(rows, (row) => row.siteName),
    siteSubName: assembleLocalizedField(rows, (row) => row.siteSubName),
    siteSignature: assembleLocalizedField(rows, (row) => row.siteSignature),
    siteCopyright: assembleLocalizedField(rows, (row) => row.siteCopyright),
  };
}
