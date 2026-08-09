import React from "react";
import { MenuItem } from "@/packages/ui/extended/Menu";
import {
  Permission,
  can,
  type Permission as PermissionValue,
} from "@/packages/auth/permissions";
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
export interface AdminMenuItem extends MenuItem {
  permission: PermissionValue;
  children?: AdminMenuItem[];
}

export const menu: AdminMenuItem[] = [
  {
    name: "控制台",
    path: "/admin/dashboard",
    permission: Permission.statisticsRead,
    icon: <Gauge strokeWidth={1.5} size={18} />,
  },
  {
    name: "文章",
    path: "/admin/post",
    permission: Permission.postReadAll,
    icon: <FileChartColumn strokeWidth={1.5} size={18} />,
    children: [
      {
        name: "添加新文章",
        path: "/admin/post/edit",
        permission: Permission.postCreate,
      },
      {
        name: "文章列表",
        path: "/admin/post/list",
        permission: Permission.postReadAll,
      },
      {
        name: "分类目录",
        path: "/admin/post/category",
        permission: Permission.categoryReadAll,
      },
    ],
  },
  {
    name: "页面",
    path: "/admin/page",
    permission: Permission.pageReadAll,
    icon: <NotepadText strokeWidth={1.5} size={18} />,
    children: [
      {
        name: "添加新页面",
        path: "/admin/page/edit",
        permission: Permission.pageCreate,
      },
      {
        name: "页面列表",
        path: "/admin/page/list",
        permission: Permission.pageReadAll,
      },
    ],
  },
  {
    name: "媒体",
    path: "/admin/media",
    permission: Permission.mediaReadAll,
    icon: <ImageIcon strokeWidth={1.5} size={18} aria-hidden />,
  },
  {
    name: "菜单",
    path: "/admin/menu",
    permission: Permission.menuReadAll,
    icon: <Menu strokeWidth={1.5} size={18} />,
  },
  {
    name: "标签",
    path: "/admin/tag",
    permission: Permission.tagCreate,
    icon: <Tags strokeWidth={1.5} size={18} />,
  },
  {
    name: "评论",
    path: "/admin/comment",
    permission: Permission.commentReadAll,
    icon: <MessageSquareMore strokeWidth={1.5} size={18} />,
  },
  {
    name: "用户",
    path: "/admin/user",
    permission: Permission.userReadAll,
    icon: <Users strokeWidth={1.5} size={18} />,
  },
  {
    name: "友情链接",
    path: "/admin/link",
    permission: Permission.linkReadAll,
    icon: <Link strokeWidth={1.5} size={18} />,
  },
  {
    name: "设置",
    path: "/admin/setting",
    permission: Permission.settingUpdate,
    icon: <Settings strokeWidth={1.5} size={18} />,
  },
  {
    name: "账号安全",
    path: "/admin/account/security",
    permission: Permission.userReadSelf,
    icon: <ShieldCheck strokeWidth={1.5} size={18} />,
  },
];

export function getMenuForCapabilities(
  role: string | null | undefined,
  items: readonly AdminMenuItem[] = menu,
): AdminMenuItem[] {
  return items.flatMap((item) => {
    if (!can(role, item.permission)) return [];
    const children = item.children
      ? getMenuForCapabilities(role, item.children)
      : undefined;
    return [{ ...item, children }];
  });
}
