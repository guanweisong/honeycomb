"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import React from "react";
import { Link } from "@/lib/i18n/blog-navigation";
import { useLocale } from "next-intl";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import type { MenuNavigationItem } from "@/app/(blog)/types/menu-navigation-item";
import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";

/**
 * 面包屑组件的属性接口。
 */
export interface BreadCrumbProps {
  /**
   * 菜单数据，用于构建面包屑路径。
   */
  menu: MenuNavigationItem[];
}

/**
 * 单个面包屑项的数据结构。
 */
export interface BreadData {
  /**
   * 面包屑项的显示文本。
   */
  label: React.ReactNode;
  /**
   * 面包屑项的链接地址。
   */
  link?: string;
}

/**
 * 面包屑导航组件。
 * 根据当前路由和菜单数据生成面包屑路径，方便用户了解当前位置。
 * @param {BreadCrumbProps} props - 组件属性。
 * @returns {JSX.Element | null} 面包屑导航或 null。
 */
const Breadcrumb = (props: BreadCrumbProps) => {
  const menu = props.menu;
  const segments = useSelectedLayoutSegments();
  const segmentType = segments[0];
  const segmentTypePath = segments[1]?.split("/") ?? [];
  const locale = normalizeMultiLangLocale(useLocale());

  /**
   * 首页菜单项。
   */
  const HomeItem = menu.find((item) => item.id === "home");

  /**
   * 面包屑数据数组。
   */
  const breadData: BreadData[] = [
    {
      label: HomeItem?.title?.[locale],
      link: "/list/category",
    },
  ];

  if (segmentType === "list" && segmentTypePath[0] === "category") {
    const paths = segmentTypePath.slice(1);
    for (const [index, path] of paths.entries()) {
      const item = menu.find((item) => {
        if (item.path !== path) return false;
        // Match the public URL ancestry, which omits null-path bridge nodes.
        const canonicalPaths = getCurrentPathOfMenu({
          id: item.id,
          familyProp: "path",
          menu,
        });
        return (
          canonicalPaths.length === index + 1 &&
          canonicalPaths.every((part, ancestor) => part === paths[ancestor])
        );
      });
      // Do not invent a current page for a partially resolved route.
      if (!item) return null;
      breadData.push({
        label: item.title?.[locale],
        link:
          index < paths.length - 1
            ? `/list/category/${paths
                .slice(0, index + 1)
                .map(encodeURIComponent)
                .join("/")}`
            : undefined,
      });
    }
  }

  if (breadData.length === 1) {
    breadData.pop();
  }

  if (breadData.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-2 lg:mb-4 container box-border px-2 text-auto-front-gray/50"
    >
      {breadData?.map((item, index) => (
        <span key={`${item.link}_${index}`}>
          {item.link ? (
            <Link href={item.link} key={item.link}>
              {item.label}
            </Link>
          ) : (
            <span key={item.link} aria-current="page">
              {item.label}
            </span>
          )}
          {index !== breadData.length - 1 ? " / " : ""}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumb;
