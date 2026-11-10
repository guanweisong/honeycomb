import React from "react";
import type { AdminNavigationItem } from "@/app/admin/components/AdminNavigation";
import {
  Permission,
  can,
  type Permission as PermissionValue,
} from "@/lib/auth/permissions";
import {
  adminRouteCapabilities,
  canAccessAdminRoute,
} from "@/app/admin/constants/route-capabilities";
import {
  FileChartColumn,
  Gauge,
  NotepadText,
  Image as ImageIcon,
  Menu,
  Tags,
  MessageSquareMore,
  Users,
  Link,
  Settings,
  ShieldCheck,
} from "lucide-react";

/**
 * 后台管理系统的菜单数据。
 * 定义了侧边栏导航的结构和每个菜单项的属性，包括名称、路径、图标和子菜单。
 */
export interface AdminMenuItem extends AdminNavigationItem {
  path: keyof typeof adminRouteCapabilities;
  additionalPermission?: PermissionValue;
  children?: AdminMenuItem[];
}

export const menu: AdminMenuItem[] = [
  {
    name: "控制台",
    path: "/admin/dashboard",
    icon: <Gauge strokeWidth={1.5} size={18} />,
  },
  {
    name: "文章",
    path: "/admin/post",
    icon: <FileChartColumn strokeWidth={1.5} size={18} />,
    children: [
      {
        name: "添加新文章",
        path: "/admin/post/edit",
        additionalPermission: Permission.postCreate,
      },
      {
        name: "文章列表",
        path: "/admin/post/list",
      },
      {
        name: "分类目录",
        path: "/admin/post/category",
      },
    ],
  },
  {
    name: "页面",
    path: "/admin/page",
    icon: <NotepadText strokeWidth={1.5} size={18} />,
    children: [
      {
        name: "添加新页面",
        path: "/admin/page/edit",
        additionalPermission: Permission.pageCreate,
      },
      {
        name: "页面列表",
        path: "/admin/page/list",
      },
    ],
  },
  {
    name: "媒体",
    path: "/admin/media",
    icon: <ImageIcon strokeWidth={1.5} size={18} aria-hidden />,
  },
  {
    name: "菜单",
    path: "/admin/menu",
    icon: <Menu strokeWidth={1.5} size={18} />,
  },
  {
    name: "标签",
    path: "/admin/tag",
    icon: <Tags strokeWidth={1.5} size={18} />,
  },
  {
    name: "评论",
    path: "/admin/comment",
    icon: <MessageSquareMore strokeWidth={1.5} size={18} />,
  },
  {
    name: "用户",
    path: "/admin/user",
    icon: <Users strokeWidth={1.5} size={18} />,
  },
  {
    name: "友情链接",
    path: "/admin/link",
    icon: <Link strokeWidth={1.5} size={18} />,
  },
  {
    name: "设置",
    path: "/admin/setting",
    icon: <Settings strokeWidth={1.5} size={18} />,
  },
  {
    name: "账号安全",
    path: "/admin/account/security",
    icon: <ShieldCheck strokeWidth={1.5} size={18} />,
  },
];

export function getMenuForCapabilities(
  role: string | null | undefined,
  items: readonly AdminMenuItem[] = menu,
): AdminMenuItem[] {
  return items.flatMap((item) => {
    if (
      !canAccessAdminRoute(role, item.path) ||
      (item.additionalPermission && !can(role, item.additionalPermission))
    )
      return [];
    const children = item.children
      ? getMenuForCapabilities(role, item.children)
      : undefined;
    return [{ ...item, children }];
  });
}
