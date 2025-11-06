import { ViewTransition } from "react";
// @ts-ignore
import listToTree from "list-to-tree-lite";
import Menu from "@/components/Menu";
import { Link } from "@/i18n/navigation";
import getCurrentPathOfMenu from "@/utils/getCurrentPathOfMenu";
import Breadcrumb from "@/components/Breadcrumb";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLocale } from "next-intl/server";
import { serverClient } from "@honeycomb/trpc/server";
import { MenuLocalEntity } from "@/types/menu.local.entity";
import { MenuType } from "@honeycomb/types/menu/menu.type";
import { MenuEntityTree } from "@/types/menu.entity.tree";
import { MultiLangEnum } from "@honeycomb/types/multi.lang";
import { MenuEntity } from "@honeycomb/trpc/server/types/menu.entity";

/**
 * 网站头部组件。
 * 显示网站名称、主题切换、语言切换和导航菜单。
 * @returns {Promise<JSX.Element>} 网站头部。
 */
export default async function Header() {
  const [setting, menu, locale] = await Promise.all([
    serverClient.setting.index(),
    serverClient.menu.index(),
    getLocale(),
  ]);

  /**
   * 包含所有菜单项的数组，包括首页和友情链接。
   */
  const allMenu = [
    {
      title: { zh: "首页", en: "Home" },
      id: "home",
      path: "/",
      children: [],
    },
    ...menu?.list,
    {
      title: { zh: "比邻", en: "Links" },
      id: "links",
      path: "/links",
      children: [],
    },
  ];

  /**
   * 将扁平化的菜单数据转换为树形结构。
   */
  const menuTree = listToTree(allMenu, {
    idKey: "id",
    parentKey: "parent",
  }) as MenuEntityTree[];

  /**
   * 计算菜单的 Link。
   * 将处理后的菜单数据格式化为 `MenuItem` 数组，用于 `Menu` 组件。
   * @returns {MenuLocalEntity[]} 格式化后的菜单数据。
   */
  const getMenuData = () => {
    const result: MenuLocalEntity[] = [];
    const getItem = (data: MenuEntityTree) => {
      /**
       * 递归处理单个菜单项，生成 `MenuItem` 格式。
       * @param {MenuEntityTree} data - 原始菜单实体数据。
       * @returns 格式化后的菜单项。
       */
      const item = {
        label: data.title?.[locale as MultiLangEnum],
      } as MenuLocalEntity;
      if (data.id === "home") {
        item.link = "/list/category";
      } else if (data.id === "links") {
        item.link = data.path!;
      }
      switch (data.type) {
        case MenuType.PAGE:
          item.link = `/pages/${data.id}`;
          break;
        case MenuType.CATEGORY:
          item.link = `/list/category/${getCurrentPathOfMenu({
            id: data.id,
            familyProp: "path",
            menu: menu?.list,
          }).join("/")}`;
          break;
      }
      if (data.children?.length) {
        item.children = data.children.map((m) => getItem(m));
      }
      return item;
    };
    menuTree.forEach((item) => {
      result.push(getItem(item));
    });
    return result;
  };

  /**
   * 格式化后的菜单数据，用于渲染导航菜单。
   */
  const menuDataFormat = getMenuData();

  return (
    <>
      <div className="mb-2 lg:mb-4 fixed left-0 right-0 top-0 before:content-[''] before:absolute before:inset-0 before:backdrop-blur before:bg-auto-back-gray/80 h-12 lg:h-20 z-50">
        <div className="container relative box-border h-full flex justify-between items-center">
          <div className="h-full flex items-center">
            <span className="lg:ml-2 absolute inset-x-24 lg:static text-center">
              <ViewTransition name="siteTitle">
                <Link
                  href={"/list/category"}
                  scroll={false}
                  className="text-pink-500 text-xl"
                >
                  {setting?.siteName?.[locale as MultiLangEnum]}
                </Link>
              </ViewTransition>
            </span>
            <span className="ml-4">
              <ThemeSwitcher />
            </span>
            <span className="ml-4">
              <LanguageSwitcher />
            </span>
          </div>
          <div className="h-full flex items-center">
            <Menu data={menuDataFormat} flatMenuData={menu?.list} />
          </div>
        </div>
      </div>
      <ViewTransition name="siteBreadcrumb">
        <Breadcrumb menu={allMenu as MenuEntity[]} />
      </ViewTransition>
    </>
  );
}
