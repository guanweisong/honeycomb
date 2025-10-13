import { defineRouting } from "next-intl/routing";
import { Language } from "@/types/Language";

/**
 * 国际化路由配置。
 * 定义了应用支持的语言环境和默认语言。
 */
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: [Language.En, Language.Zh],

  // Used when no locale matches
  defaultLocale: Language.En,
});
