"use client";

import { useLocale } from "next-intl";
import { ViewTransition } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { getPathname, usePathname } from "@/lib/i18n/blog-navigation";
import { useTheme } from "next-themes";
import zhIcon from "./img/zh.svg";
import enIcon from "./img/en.svg";
import zhIconLight from "./img/zh.light.svg";
import enIconLight from "./img/en.light.svg";
import { parseStaticImage } from "@/lib/ui/static-image";
import { Theme } from "@/app/(blog)/types/Theme";
import { MultiLangEnum, normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { useMounted } from "@/lib/hooks/use-mounted";

/**
 * 语言切换组件。
 * 允许用户在不同的语言之间切换，并根据当前主题显示不同的语言图标。
 * @returns {JSX.Element | null} 语言切换按钮或 null。
 */
const LanguageSwitcher = () => {
  const locale = normalizeMultiLangLocale(useLocale());
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  /**
   * 组件是否已挂载。
   * 用于解决 `next-themes` 在服务器端渲染时的 `resolvedTheme` 不匹配问题。
   */
  const mounted = useMounted();

  /**
   * 另一个语言环境。
   */
  const otherLocale =
    locale === MultiLangEnum.En ? MultiLangEnum.Zh : MultiLangEnum.En;
  const localizedPathname = getPathname({
    href: pathname,
    locale: otherLocale,
  });

  if (!mounted) {
    return null;
  }

  /**
   * 根据当前主题和语言环境选择对应的语言图标。
   */
  const localeIcon = {
    en: parseStaticImage(resolvedTheme === Theme.Dark ? enIconLight : enIcon),
    zh: parseStaticImage(resolvedTheme === Theme.Dark ? zhIconLight : zhIcon),
  };

  return (
    <ViewTransition name="siteLanguageSwitcher">
      <NextLink
        href={localizedPathname}
        hrefLang={otherLocale}
        prefetch={true}
        replace
        aria-label={`Switch to ${otherLocale === "en" ? "English" : "中文"}`}
      >
        <Image
          src={localeIcon[locale]}
          alt={`Current language: ${locale === "en" ? "English" : "中文"}`}
          className="w-5 cursor-pointer"
        />
      </NextLink>
    </ViewTransition>
  );
};

export default LanguageSwitcher;
