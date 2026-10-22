import { ViewTransition } from "react";
import Menu from "@/app/(blog)/_components/Menu";
import { Link } from "@/lib/i18n/blog-navigation";
import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";
import Breadcrumb from "@/app/(blog)/_components/Breadcrumb";
import { ThemeSwitcher } from "@/app/(blog)/_components/ThemeSwitcher";
import PostSearch from "@/features/post/public/components/PostSearch";
import LanguageSwitcher from "@/app/(blog)/_components/LanguageSwitcher";
import {
  getPublicMenu,
  getPublicSetting,
} from "@/app/lib/server/public-queries";
import { getLocale } from "next-intl/server";
import { BlogNavigationLink } from "@/app/(blog)/types/blog-navigation-link";
import { MenuType } from "@/features/menu/types/menu.type";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import type { MenuItem as MenuEntity } from "@/features/menu/types/menu.list";
import type { MenuNavigationItem } from "@/app/(blog)/types/menu-navigation-item";

const toNavigationItem = ({
  id,
  parent,
  path,
  title,
}: MenuEntity): MenuNavigationItem => ({
  id,
  parent,
  path,
  title,
});

/**
 * 网站头部组件。
 * 显示网站名称、主题切换、语言切换和导航菜单。
 * @returns {Promise<JSX.Element>} 网站头部。
 */
export default async function Header() {
  const [setting, menu, locale] = await Promise.all([
    getPublicSetting(),
    getPublicMenu(),
    getLocale(),
  ]);
  const language = normalizeMultiLangLocale(locale);

  /**
   * 包含所有菜单项的数组。
   */
  const home: MenuEntity = {
    title: { zh: "首页", en: "Home" },
    id: "home",
    parent: null,
    power: 0,
    type: MenuType.CUSTOM,
    path: "/",
    createdAt: null,
    updatedAt: null,
  };
  const allMenu = [home, ...menu.list];

  const navigation = menu.list.map(toNavigationItem);
  const breadcrumbNavigation = [toNavigationItem(home), ...navigation];
  const menuIds = new Set(allMenu.map((item) => item.id));
  // Only roots are displayed; keep all navigation records for ancestor matching.
  const navigationLinks: BlogNavigationLink[] = allMenu
    .filter((item) => !item.parent || !menuIds.has(item.parent))
    .map((data) => {
      let link =
        data.id === "home"
          ? "/list/category"
          : data.id === "links"
            ? (data.path ?? "")
            : "";
      if (data.type === MenuType.PAGE) link = `/pages/${data.id}`;
      if (data.type === MenuType.CATEGORY) {
        link = `/list/category/${getCurrentPathOfMenu({ id: data.id, familyProp: "path", menu: menu.list }).join("/")}`;
      }
      return { label: data.title?.[language] ?? "", link };
    });

  return (
    <>
      <div className="h-[60px] lg:h-0" />
      <header className="fixed lg:relative top-0 left-0 right-0 z-50 h-[48px] lg:h-[120px] lg:before:hidden before:content-[''] before:absolute before:inset-0 before:backdrop-blur before:bg-auto-back-gray/80">
        <div className="container h-full box-border flex justify-between items-center relative">
          <div className="flex items-center">
            <span className="lg:ml-2 absolute inset-x-24 lg:static text-center">
              <Link
                href={"/list/category"}
                scroll={false}
                className="text-teal-500 text-lg"
              >
                {setting?.siteName?.[language]}
              </Link>
            </span>
          </div>
          <div className="flex items-center">
            <Menu data={navigationLinks} flatMenuData={navigation} />
          </div>
          <div className="flex items-center gap-3 mr-2 shrink-0">
            <div data-testid="theme-switcher">
              <ThemeSwitcher />
            </div>
            <LanguageSwitcher />
            <PostSearch />
          </div>
        </div>
      </header>
      <ViewTransition name="siteBreadcrumb">
        <Breadcrumb menu={breadcrumbNavigation} />
      </ViewTransition>
    </>
  );
}
