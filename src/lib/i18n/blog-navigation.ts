import { createNavigation } from "next-intl/navigation";
import { createElement, type ComponentProps } from "react";
import { routing } from "./routing";

/**
 * `next-intl` 提供的轻量级导航 API 包装器。
 * 考虑了路由配置，用于在应用中进行导航。
 */
const navigation = createNavigation(routing);

/** 默认预取博客正文，允许密集链接按调用点改用页面外壳或禁用预取。 */
export function Link({
  prefetch = true,
  ...props
}: ComponentProps<typeof navigation.Link>) {
  return createElement(navigation.Link, { ...props, prefetch });
}

export const { getPathname, usePathname, useRouter } = navigation;
