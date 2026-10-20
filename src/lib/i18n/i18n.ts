import { z } from "zod";

export enum MultiLangEnum {
  Zh = "zh",
  En = "en",
}

export const supportedLanguages = [MultiLangEnum.Zh, MultiLangEnum.En] as const;

function localizedObject<T extends z.ZodType>(
  field: (language: MultiLangEnum) => T,
) {
  return z.object({
    en: field(MultiLangEnum.En),
    zh: field(MultiLangEnum.Zh),
  });
}

/** 完整语言值的唯一规则；传输边界只提供错误文案。 */
export function createI18nSchema(messages?: Record<MultiLangEnum, string>) {
  return localizedObject((language) => {
    const message = messages?.[language];
    return z.string({ message }).trim().min(1, message);
  });
}

export const I18nSchema = createI18nSchema();
/** 展示值允许缺少某种语言，但不接受 null 语言值。 */
export const PartialLocalizedTextSchema = localizedObject(() =>
  z.string().optional(),
);
/** 编辑输入允许单个语言为空；不与完整持久化值混用。 */
export const NullableLocalizedInputSchema = localizedObject(() =>
  z.string().nullish(),
).nullable();
export type NullableLocalizedInput = z.infer<
  typeof NullableLocalizedInputSchema
>;

export const NullableI18nSchema = I18nSchema.nullable();

export type I18n = z.infer<typeof I18nSchema>;
