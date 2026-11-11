import { createNavigation } from "next-intl/navigation";
import NextLink from "next/link";
import { createElement, type ComponentProps } from "react";
import { routing } from "@/lib/i18n/routing";

/**
 * `next-intl` 提供的轻量级导航 API 包装器。
 * 考虑了路由配置，用于在应用中进行导航。
 */
const navigation = createNavigation(routing);

/** 默认预取博客正文，允许密集链接按调用点改用页面外壳或禁用预取。 */
export function Link({
  prefetch = true,
  locale,
  href,
  ...props
}: ComponentProps<typeof navigation.Link>) {
  if (locale != null && typeof href === "string") {
    // next-intl disables prefetch for locale changes; keep Blog's link policy
    // while still deriving the target URL from the shared routing config.
    return createElement(NextLink, {
      ...props,
      href: navigation.getPathname({ href, locale, forcePrefix: true }),
      hrefLang: props.hrefLang ?? locale,
      prefetch,
    });
  }

  return createElement(navigation.Link, { ...props, href, locale, prefetch });
}

export const { getPathname, usePathname, useRouter } = navigation;
