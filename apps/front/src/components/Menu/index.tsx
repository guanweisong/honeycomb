"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useClickAway } from "ahooks";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import getCurrentPathOfMenu from "@/utils/getCurrentPathOfMenu";
import { cn } from "@honeycomb/ui/lib/utils";
import { MenuEntity } from "@honeycomb/validation/menu/schemas/menu.entity.schema";
import { trpc } from "@honeycomb/trpc/client/trpc";

export interface MenuItem {
  label: React.ReactNode;
  link: any;
  children?: MenuItem[];
}

export interface MenuProps {
  data: MenuItem[];
  flatMenuData: MenuEntity[];
}

const Menu = (props: MenuProps) => {
  const { data, flatMenuData } = props;
  const ref1 = useRef<HTMLUListElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string[]>([]);

  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();

  const { data: postDetail } = trpc.post.getCategoryId.useQuery(
    { id: segments?.[1] ?? "" },
    { enabled: !!segments?.[1] }, // 只有有 id 时才请求
  );

  useEffect(() => {
    setVisible(false);
    judgeCurrentMenu();
    // 依赖 postDetail：当异步数据到来时也会重新计算
  }, [pathname, postDetail]);

  useClickAway(() => {
    setVisible(false);
  }, [ref1, ref2]);

  /**
   * 计算当前菜单值（不再使用 serverClient）
   */
  const judgeCurrentMenu = () => {
    const segs = segments ?? [];
    let allCategoryPath = `/${segs.join("/")}`;

    switch (segs[0]) {
      case "archives":
        // postDetail 是 useQuery 的 data，可能还没来
        if (!postDetail) {
          // 还没拿到详情，先设为基础路径（或直接 return，视你的 UX 期望）
          setCurrentCategory([allCategoryPath]);
          return;
        }
        allCategoryPath = `/list/category/${getCurrentPathOfMenu({
          id: postDetail.categoryId,
          familyProp: "path",
          menu: flatMenuData,
        }).join("/")}`;
        setCurrentCategory([
          allCategoryPath.split("/").slice(0, 4).join("/"),
          allCategoryPath,
        ]);
        break;
      case "list":
        setCurrentCategory([
          allCategoryPath.split("/").slice(0, 4).join("/"),
          allCategoryPath,
        ]);
        break;
      default:
        setCurrentCategory([allCategoryPath]);
    }
  };

  const renderItem = (data: MenuItem[]) => {
    return (
      <ul
        className={cn("absolute backdrop-blur lg:static lg:flex py-2 lg:py-0", {
          "inset-x-0 top-full shadow-md bg-auto-back-gray/80": visible,
          ["hidden"]: !visible,
        })}
        ref={ref1}
      >
        {data.map((m) => (
          <li
            className="lg:relative lg:flex group"
            key={`first-level-${m.link}`}
          >
            <Link
              href={m.link ?? ""}
              className={cn(
                "lg:relative leading-10 lg:z-20 px-4 lg:flex lg:items-center",
                {
                  "text-pink-500": m.link === currentCategory[0],
                  "group-hover:lg:text-pink-500 group-hover:lg:bg-auto-back-gray/90":
                    m.link !== currentCategory[0],
                },
              )}
            >
              {m.label}
            </Link>
            {m.children && (
              <ul
                className={cn(
                  "pointer-events-none",
                  "lg:absolute ml-4 lg:ml-0",
                  "lg:opacity-0 lg:invisible",
                  "lg:bg-auto-back-gray/90 lg:border-t-2 lg:border-pink-700",
                  "lg:z-10 lg:top-full lg:left-0 lg:right-0",
                  "lg:transition-all lg:duration-300 lg:ease-in-out",
                  "lg:translate-y-2",
                  "group-hover:lg:translate-y-0 group-hover:lg:opacity-100 group-hover:lg:visible group-hover:lg:pointer-events-auto",
                  "group-hover:lg:shadow-md",
                )}
              >
                {m.children.map((n) => (
                  <li
                    className="inline-block lg:block"
                    key={`second-level-${n.link}`}
                  >
                    <Link
                      href={n.link ?? ""}
                      className={cn(
                        "block leading-10 lg:text-center hover:lg:text-pink-500 px-4 lg:px-0",
                        {
                          "text-pink-500": n.link === currentCategory[1],
                        },
                      )}
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  };
  return (
    <div className="flex h-full">
      <div
        ref={ref2}
        className="w-10 px-2 cursor-pointer pt-2 lg:hidden"
        onClick={() => setVisible(!visible)}
      >
        {Array.from(new Array(3)).map((_item, index) => (
          <div
            key={`menu-trigger-${index}`}
            className={cn("h-0.5 my-1.5 bg-gray-500 transition-all", {
              "first:translate-y-2 first:rotate-45 even:opacity-0 last:-translate-y-2 last:-rotate-45":
                visible,
            })}
          />
        ))}
      </div>
      {renderItem(data)}
    </div>
  );
};

export default Menu;
