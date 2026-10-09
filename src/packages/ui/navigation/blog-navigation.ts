import { createNavigation } from "next-intl/navigation";
import { createElement, type ComponentProps } from "react";
import { routing } from "./routing";

/**
 * `next-intl` 提供的轻量级导航 API 包装器。
 * 考虑了路由配置，用于在应用中进行导航。
 */
const navigation = createNavigation(routing);

export function Link({
  prefetch = "auto",
  ...props
}: ComponentProps<typeof navigation.Link>) {
  return createElement(navigation.Link, { ...props, prefetch });
}

export const { getPathname, usePathname, useRouter } = navigation;
