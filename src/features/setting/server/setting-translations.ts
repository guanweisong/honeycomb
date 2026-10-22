import { supportedLanguages } from "@/lib/i18n/i18n";
import {
  assembleLocalizedField,
  hasTranslationValues,
  patchLocalizedValue,
} from "@/lib/db/translation-values";
import type * as schema from "@/lib/db/schema";
import type { SettingUpdate } from "../types/setting.patch";

export type SettingTranslationRow =
  typeof schema.settingTranslation.$inferSelect;
export type SettingTranslationFields = Omit<
  SettingTranslationRow,
  "settingId" | "locale"
>;

export function patchSettingTranslationRows(
  settingId: string,
  currentRows: readonly SettingTranslationRow[],
  input: SettingUpdate,
): SettingTranslationRow[] {
  const currentByLocale = new Map(currentRows.map((row) => [row.locale, row]));
  return supportedLanguages.flatMap((locale) => {
    const current = currentByLocale.get(locale);
    const fields: SettingTranslationFields = {
      siteName: patchLocalizedValue(
        input.siteName,
        locale,
        current?.siteName ?? null,
      ),
      siteSubName: patchLocalizedValue(
        input.siteSubName,
        locale,
        current?.siteSubName ?? null,
      ),
      siteSignature: patchLocalizedValue(
        input.siteSignature,
        locale,
        current?.siteSignature ?? null,
      ),
      siteCopyright: patchLocalizedValue(
        input.siteCopyright,
        locale,
        current?.siteCopyright ?? null,
      ),
    };
    return hasTranslationValues(Object.values(fields))
      ? [{ settingId, locale, ...fields }]
      : [];
  });
}

export function assembleSettingTranslations(
  rows: readonly SettingTranslationRow[],
) {
  return {
    siteName: assembleLocalizedField(rows, (row) => row.siteName),
    siteSubName: assembleLocalizedField(rows, (row) => row.siteSubName),
    siteSignature: assembleLocalizedField(rows, (row) => row.siteSignature),
    siteCopyright: assembleLocalizedField(rows, (row) => row.siteCopyright),
  };
}

export function toSettingRecord(
  setting: typeof schema.setting.$inferSelect,
  translations: readonly (typeof schema.settingTranslation.$inferSelect)[],
) {
  return {
    id: setting.id,
    version: setting.version,
    siteRecordNo: setting.siteRecordNo,
    siteRecordUrl: setting.siteRecordUrl,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
    ...assembleSettingTranslations(translations),
  };
}
