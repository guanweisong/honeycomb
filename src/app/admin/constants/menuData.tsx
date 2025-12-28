import React from "react";
import { MenuItem } from "@/packages/ui/extended/Menu";
import {
  FileChartColumn,
  Gauge,
  NotepadText,
  Image,
  Menu,
  Tags,
  MessageSquareMore,
  Users,
  Link,
  Settings,
} from "lucide-react";

/**
 * 后台管理系统的菜单数据。
 * 定义了侧边栏导航的结构和每个菜单项的属性，包括名称、路径、图标和子菜单。
 */
export const menu: MenuItem[] = [
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
    icon: <Image strokeWidth={1.5} size={18} />,
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
];
