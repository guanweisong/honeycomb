import { defineRouting } from "next-intl/routing";
import { MultiLangEnum } from "@/packages/domain/localization/multi-lang";

/**
 * 国际化路由配置。
 * 定义了应用支持的语言环境和默认语言。
 */
export const routing = defineRouting({
  // 所有受支持的语言环境列表。
  locales: [MultiLangEnum.En, MultiLangEnum.Zh],

  // 没有匹配到语言环境时使用的默认语言。
  defaultLocale: MultiLangEnum.En,
});
