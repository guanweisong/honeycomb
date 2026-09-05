/**
 * 多语言文本结构类型。
 * 用于在单个字段中存储中英文两种语言的内容。
 */

import type { z } from "zod";
import { MultiLangEnum, type PartialLocalizedTextSchema } from "./i18n";

export type MultiLang = z.infer<typeof PartialLocalizedTextSchema>;

/**
 * 多语言枚举。
 * 定义了支持的语言类型。
 */
export { MultiLangEnum } from "./i18n";

/** 将外部 locale 字符串收敛到应用支持的语言键。 */
export function normalizeMultiLangLocale(locale: string): MultiLangEnum {
  return locale === MultiLangEnum.Zh ? MultiLangEnum.Zh : MultiLangEnum.En;
}
