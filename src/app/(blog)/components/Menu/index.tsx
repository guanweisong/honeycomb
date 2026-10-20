"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/lib/i18n/blog-navigation";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";
import { cn } from "@/lib/ui/utils";
import { trpc } from "@/lib/trpc/client/trpc";
import { MenuLocalEntity } from "@/app/(blog)/types/menu.local.entity";
import type { MenuItem as MenuEntity } from "@/features/menu/types";

/**
 * 菜单组件的属性接口。
 */
export interface MenuProps {
  /**
   * 树形结构的菜单数据。
   */
  data: MenuLocalEntity[];
  /**
   * 扁平化的菜单数据。
   */
  flatMenuData: MenuEntity[];
}

const getActiveCategories = ({
  segments,
  postCategoryId,
  flatMenuData,
}: {
  segments: string[];
  postCategoryId?: string;
  flatMenuData: MenuEntity[];
}) => {
  const allCategoryPath = `/${segments.join("/")}`;

  if (segments[0] === "archives") {
    if (!postCategoryId) {
      return [allCategoryPath];
    }

    const categoryPath = `/list/category/${getCurrentPathOfMenu({
      id: postCategoryId,
      familyProp: "path",
      menu: flatMenuData,
    }).join("/")}`;

    return [categoryPath.split("/").slice(0, 4).join("/"), categoryPath];
  }

  if (segments[0] === "list") {
    return [allCategoryPath.split("/").slice(0, 4).join("/"), allCategoryPath];
  }

  return [allCategoryPath];
};

function MenuBranch({
  item,
  activeCategories,
  depth = 0,
}: {
  item: MenuLocalEntity;
  activeCategories: string[];
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const submenuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const active = activeCategories.includes(item.link ?? "");
  return (
    <li
      className={cn("relative group", depth === 0 && "lg:flex lg:items-center")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.stopPropagation();
          setExpanded(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <div className="flex items-center">
        <Link
          href={item.link ?? ""}
          aria-current={active ? "page" : undefined}
          className={cn(
            "lg:relative leading-10 lg:z-20 px-4 lg:flex lg:items-center",
            {
              "text-teal-500": active,
              "group-hover:lg:text-teal-500": !active,
            },
          )}
        >
          {item.label}
          {active && depth === 0 && (
            <span
              className="absolute hidden lg:block inset-x-1 -bottom-px h-px bg-linear-to-r from-teal-500/0 via-teal-500/40 to-teal-500/0 dark:from-teal-400/0 dark:via-teal-400/40 dark:to-teal-400/0"
              aria-hidden="true"
            />
          )}
        </Link>
        {!!item.children?.length && (
          <button
            ref={toggleRef}
            type="button"
            aria-label={item.label}
            aria-expanded={expanded}
            aria-controls={submenuId}
            className="px-2 py-2 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
          </button>
        )}
      </div>
      {!!item.children?.length && (
        <ul
          id={submenuId}
          hidden={!expanded}
          className={cn(
            "pl-4 bg-auto-back-gray/95",
            depth === 0 &&
              "lg:absolute lg:top-full lg:left-0 lg:min-w-48 lg:rounded-lg lg:shadow-lg",
          )}
        >
          {item.children.map((child, index) => (
            <MenuBranch
              key={`${child.link}-${index}`}
              item={child}
              activeCategories={activeCategories}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * 导航菜单组件。
 * 支持多级菜单，响应式布局，并根据当前路由高亮显示菜单项。
 * @param {MenuProps} props - 组件属性。
 * @returns {JSX.Element} 导航菜单。
 */
const Menu = (props: MenuProps) => {
  const { data, flatMenuData } = props;
  const ref1 = useRef<HTMLUListElement>(null);
  const ref2 = useRef<HTMLButtonElement>(null);

  /**
   * 控制移动端菜单的显示与隐藏。
   */
  const [visible, setVisible] = useState(false);

  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();

  /**
   * 获取文章详情的 tRPC 查询。
   * 用于在文章详情页时，根据文章的分类 ID 来高亮显示菜单。
   */
  const { data: postDetail } = trpc.post.getCategoryId.useQuery(
    { id: segments?.[1] ?? "" },
    { enabled: !!segments?.[1] && segments?.[0] === "archives" }, // 只有有 id 时才请求
  );

  const activeCategories = getActiveCategories({
    segments: segments ?? [],
    postCategoryId: postDetail?.categoryId,
    flatMenuData,
  });

  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !ref1.current?.contains(event.target) &&
        !ref2.current?.contains(event.target)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  /**
   * 递归渲染菜单项。
   * @param {MenuLocalEntity[]} data - 菜单项数据数组。
   * @returns {JSX.Element} 渲染后的菜单列表。
   */
  const renderItem = (data: MenuLocalEntity[]) => {
    return (
      <ul
        id="mobile-menu"
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          "absolute backdrop-blur bg-auto-back-gray/80",
          "lg:static lg:flex py-2 lg:py-0 lg:px-2 lg:rounded-full",
          {
            "inset-x-0 top-full": visible,
            ["hidden"]: !visible,
          },
        )}
        ref={ref1}
      >
        {data.map((item, index) => (
          <MenuBranch
            key={`${item.link}-${index}`}
            item={item}
            activeCategories={activeCategories}
          />
        ))}
      </ul>
    );
  };
  return (
    <div
      className="flex h-full"
      onKeyDown={(event) => {
        if (event.key === "Escape" && visible) {
          setVisible(false);
          ref2.current?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={ref2}
        className="w-9 px-2 cursor-pointer lg:hidden absolute left-0 top-[50%] -translate-y-1/2 bg-transparent border-0"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Close menu" : "Open menu"}
        aria-expanded={visible}
        aria-controls="mobile-menu"
      >
        {Array.from(new Array(3)).map((_item, index) => (
          <div
            key={`menu-trigger-${index}`}
            className={cn("h-0.5 my-1 bg-gray-500 transition-all", {
              "first:translate-y-1.5 first:rotate-45 even:opacity-0 last:-translate-y-1.5 last:-rotate-45":
                visible,
            })}
          />
        ))}
      </button>
      {renderItem(data)}
    </div>
  );
};

export default Menu;
