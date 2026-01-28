"use client";

import { useLocale } from "next-intl";
import { useEffect, useState, ViewTransition } from "react";
import Image from "next/image";
import { usePathname } from "@/app/(blog)/i18n/navigation";
import { useTheme } from "next-themes";
import zhIcon from "./img/zh.svg";
import enIcon from "./img/en.svg";
import zhIconLight from "./img/zh.light.svg";
import enIconLight from "./img/en.light.svg";
import { Theme } from "@/app/(blog)/types/Theme";
import { MultiLangEnum, MultiLang } from "@/packages/types/multi.lang";
import { Link } from "@/app/(blog)/i18n/navigation";

/**
 * 语言切换组件。
 * 允许用户在不同的语言之间切换，并根据当前主题显示不同的语言图标。
 * @returns {JSX.Element | null} 语言切换按钮或 null。
 */
const LanguageSwitcher = () => {
  const locale = useLocale() as keyof MultiLang;
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  /**
   * 组件是否已挂载。
   * 用于解决 `next-themes` 在服务器端渲染时的 `resolvedTheme` 不匹配问题。
   */
  const [mounted, setMounted] = useState(false);

  /**
   * 另一个语言环境。
   */
  const otherLocale =
    locale === MultiLangEnum.En ? MultiLangEnum.Zh : MultiLangEnum.En;

  /**
   * 副作用钩子，用于在组件挂载后设置 `mounted` 状态。
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  /**
   * 根据当前主题和语言环境选择对应的语言图标。
   */
  const localeIcon = {
    en: resolvedTheme === Theme.Dark ? enIconLight : enIcon,
    zh: resolvedTheme === Theme.Dark ? zhIconLight : zhIcon,
  };

  return (
    <ViewTransition name="siteLanguageSwitcher">
      <Link href={pathname} locale={otherLocale} replace>
        <Image
          src={localeIcon[locale]}
          alt="switch language"
          className="w-5 cursor-pointer"
        />
      </Link>
    </ViewTransition>
  );
};

export default LanguageSwitcher;
