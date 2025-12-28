import { defineRouting } from "next-intl/routing";
import { MultiLangEnum } from "@/packages/types/multi.lang";

/**
 * 国际化路由配置。
 * 定义了应用支持的语言环境和默认语言。
 */
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: [MultiLangEnum.En, MultiLangEnum.Zh],

  // Used when no locale matches
  defaultLocale: MultiLangEnum.En,
});
