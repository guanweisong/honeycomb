import React from "react";
import { MenuItem } from "@honeycomb/ui/extended/Menu";
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

export const menu: MenuItem[] = [
  {
    name: "控制台",
    path: "/dashboard",
    icon: <Gauge strokeWidth={1.5} size={18} />,
  },
  {
    name: "文章",
    path: "/post",
    icon: <FileChartColumn strokeWidth={1.5} size={18} />,
    children: [
      {
        name: "添加新文章",
        path: "/post/edit",
      },
      {
        name: "文章列表",
        path: "/post/list",
      },
      {
        name: "分类目录",
        path: "/post/category",
      },
    ],
  },
  {
    name: "页面",
    path: "/page",
    icon: <NotepadText strokeWidth={1.5} size={18} />,
    children: [
      {
        name: "添加新页面",
        path: "/page/edit",
      },
      {
        name: "页面列表",
        path: "/page/list",
      },
    ],
  },
  {
    name: "媒体",
    path: "/media",
    icon: <Image strokeWidth={1.5} size={18} />,
  },
  {
    name: "菜单",
    path: "/menu",
    icon: <Menu strokeWidth={1.5} size={18} />,
  },
  {
    name: "标签",
    path: "/tag",
    icon: <Tags strokeWidth={1.5} size={18} />,
  },
  {
    name: "评论",
    path: "/comment",
    icon: <MessageSquareMore strokeWidth={1.5} size={18} />,
  },
  {
    name: "用户",
    path: "/user",
    icon: <Users strokeWidth={1.5} size={18} />,
  },
  {
    name: "友情链接",
    path: "/link",
    icon: <Link strokeWidth={1.5} size={18} />,
  },
  {
    name: "设置",
    path: "/setting",
    icon: <Settings strokeWidth={1.5} size={18} />,
  },
];
