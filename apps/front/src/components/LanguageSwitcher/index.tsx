"use client";

import { useLocale } from "next-intl";
import {
  useEffect,
  useState,
  unstable_ViewTransition as ViewTransition,
} from "react";
import Image from "next/image";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { useTheme } from "next-themes";
import zhIcon from "./img/zh.svg";
import enIcon from "./img/en.svg";
import zhIconLight from "./img/zh.light.svg";
import enIconLight from "./img/en.light.svg";
import { Theme } from "@/src/types/Theme";
import { Language, MultiLang } from "@/src/types/Language";
import { Link } from "@/src/i18n/navigation";

const LanguageSwitcher = () => {
  const locale = useLocale() as keyof MultiLang;
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const otherLocale = locale === Language.En ? Language.Zh : Language.En;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
