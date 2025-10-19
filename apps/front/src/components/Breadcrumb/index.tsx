"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import React from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { MultiLang } from "@honeycomb/types/multi.lang";
import { MenuEntity } from "@honeycomb/validation/menu/schemas/menu.entity.schema";

/**
 * 面包屑组件的属性接口。
 */
export interface BreadCrumbProps {
  /**
   * 菜单数据，用于构建面包屑路径。
   */
  menu: MenuEntity[];
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
  const locale = useLocale() as keyof MultiLang;

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

  switch (segmentType) {
    case "list":
      if (segmentTypePath[1]) {
        const firstLevelItem = menu.find(
          (item) => item.path === segmentTypePath[1],
        );
        if (firstLevelItem) {
          breadData.push({
            label: firstLevelItem.title?.[locale],
          });
        }
      }
      if (segmentTypePath[2]) {
        const secondLevelItem = menu.find(
          (item) => item.path === segmentTypePath[2],
        );
        if (secondLevelItem) {
          breadData.push({
            label: secondLevelItem.title?.[locale],
          });
        }
      }
      break;
  }

  if (breadData.length === 1) {
    breadData.pop();
  }

  if (breadData.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 lg:mb-4 container box-border px-2 text-auto-front-gray/50">
      {breadData?.map((item, index) => (
        <span key={item.label}>
          {item.link ? (
            <Link href={item.link} key={item.link}>
              {item.label}
            </Link>
          ) : (
            <span key={item.link}>{item.label}</span>
          )}
          {index !== breadData.length - 1 ? " / " : ""}
        </span>
      ))}
    </div>
  );
};

export default Breadcrumb;
