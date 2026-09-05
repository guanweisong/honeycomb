import { defineRouting } from "next-intl/routing";
import { MultiLangEnum } from "@/packages/domain/localization/multi-lang";
import { supportedLanguages } from "@/packages/domain/localization/i18n";

/**
 * 国际化路由配置。
 * 定义了应用支持的语言环境和默认语言。
 */
export const routing = defineRouting({
  // 所有受支持的语言环境列表。
  locales: supportedLanguages.toReversed(),

  // 没有匹配到语言环境时使用的默认语言。
  defaultLocale: MultiLangEnum.En,
});
