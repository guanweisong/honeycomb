import { unstable_ViewTransition as ViewTransition } from "react";
// @ts-ignore
import listToTree from "list-to-tree-lite";
import Menu, { MenuItem } from "@/components/Menu";
import { Link } from "@/i18n/navigation";
import getCurrentPathOfMenu from "@/utils/getCurrentPathOfMenu";
import Breadcrumb from "@/components/Breadcrumb";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLocale } from "next-intl/server";
import { serverClient } from "@honeycomb/trpc/server";
import { MenuEntity, MenuType } from "@honeycomb/db/src/types";

export default async function Header() {
  const [setting, menu, locale] = await Promise.all([
    serverClient.setting.index(),
    serverClient.menu.index(),
    getLocale(),
  ]);

  /**
   * 补充菜单
   */
  const allMenu: MenuEntity[] = [
    {
      title: { zh: "首页", en: "Home" },
      isHome: true,
      id: "home",
      path: "/",
      children: [],
    },
    ...menu?.list,
    {
      title: { zh: "比邻", en: "Links" },
      id: "links",
      path: "links",
      url: "/links",
      children: [],
    },
  ];

  /**
   * 把扁平树变换成树结构
   */
  const menuTree: MenuEntity[] = listToTree(allMenu, {
    idKey: "id",
    parentKey: "parent",
  });

  /**
   * 计算菜单的Link
   */
  const getMenuData = () => {
    const result: MenuItem[] = [];
    const getItem = (data: MenuEntity) => {
      const item = {
        label: data.title?.[locale],
      } as MenuItem;
      if (data.isHome) {
        item.link = "/list/category";
      }
      if (data.url) {
        item.link = data.url;
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
                  {setting?.siteName?.[locale]}
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
        <Breadcrumb menu={allMenu} />
      </ViewTransition>
    </>
  );
}
