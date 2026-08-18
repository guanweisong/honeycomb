import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * `next-intl` 提供的轻量级导航 API 包装器。
 * 考虑了路由配置，用于在应用中进行导航。
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
