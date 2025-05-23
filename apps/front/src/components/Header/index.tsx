import { unstable_ViewTransition as ViewTransition } from "react";
// @ts-ignore
import listToTree from "list-to-tree-lite";
import { MenuEntity } from "@/src/types/menu/menu.entity";
import Menu, { MenuItem } from "@/src/components/Menu";
import { Link } from "@/src/i18n/navigation";
import { MenuType } from "@/src/types/menu/MenuType";
import SettingServer from "@/src/services/setting";
import MenuServer from "@/src/services/menu";
import { SettingEntity } from "@/src/types/setting/setting.entity";
import getCurrentPathOfMenu from "@/src/utils/getCurrentPathOfMenu";
import Breadcrumb from "@/src/components/Breadcrumb";
import { ThemeSwitcher } from "@/src/components/ThemeSwitcher";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import { getLocale } from "next-intl/server";
import { MultiLang } from "@/src/types/Language";

export default async function Header() {
  const [setting, menu = [], locale] = (await Promise.all([
    SettingServer.indexSetting(),
    MenuServer.indexMenu(),
    getLocale(),
  ])) as [SettingEntity, MenuEntity[], keyof MultiLang];

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
    ...menu,
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
            menu,
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
            <Menu data={menuDataFormat} flatMenuData={menu} />
          </div>
        </div>
      </div>
      <ViewTransition name="siteBreadcrumb">
        <Breadcrumb menu={allMenu} />
      </ViewTransition>
    </>
  );
}
