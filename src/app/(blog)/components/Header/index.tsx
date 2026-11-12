import { Suspense, ViewTransition } from "react";
import Menu from "@/app/(blog)/components/Menu";
import { Link } from "@/app/(blog)/lib/blog-navigation";
import {
  getCategoryHref,
  getCategoryRouteSegments,
} from "@/app/(blog)/lib/category-route";
import Breadcrumb from "@/app/(blog)/components/Breadcrumb";
import { ThemeSwitcher } from "@/app/(blog)/components/ThemeSwitcher";
import PostSearch from "@/app/(blog)/components/features/post/public/components/PostSearch";
import LanguageSwitcher from "@/app/(blog)/components/LanguageSwitcher";
import { BlogNavigationLink } from "@/app/(blog)/types/blog-navigation-link";
import { MenuType } from "@/features/menu/types/menu.type";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import type { MenuItem as MenuEntity } from "@/features/menu/types/menu.list";
import type { MenuNavigationItem } from "@/app/(blog)/types/menu-navigation-item";
import { getCachedMetadataSettings } from "@/app/(blog)/lib/metadata-settings";
import { getCachedPublicMenu } from "@/app/(blog)/lib/public-menu";

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
export default async function Header({ locale }: { locale: string }) {
  const [setting, menu] = await Promise.all([
    getCachedMetadataSettings(),
    getCachedPublicMenu(),
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
        link = getCategoryHref(
          getCategoryRouteSegments({ id: data.id, menu: menu.list }),
        );
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
            <Suspense fallback={<MenuFallback data={navigationLinks} />}>
              <Menu data={navigationLinks} flatMenuData={navigation} />
            </Suspense>
          </div>
          <div className="flex items-center gap-3 mr-2 shrink-0">
            <div data-testid="theme-switcher">
              <ThemeSwitcher />
            </div>
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
            <PostSearch />
          </div>
        </div>
      </header>
      <ViewTransition name="siteBreadcrumb">
        <Suspense fallback={null}>
          <Breadcrumb menu={breadcrumbNavigation} />
        </Suspense>
      </ViewTransition>
    </>
  );
}

function MenuFallback({ data }: { data: BlogNavigationLink[] }) {
  return (
    <div className="flex h-full">
      <div
        aria-hidden="true"
        className="w-9 px-2 lg:hidden absolute left-0 top-[50%] -translate-y-1/2"
      >
        <div className="h-0.5 my-1 bg-gray-500" />
        <div className="h-0.5 my-1 bg-gray-500" />
        <div className="h-0.5 my-1 bg-gray-500" />
      </div>
      <ul
        role="navigation"
        aria-label="Main navigation"
        className="absolute backdrop-blur bg-auto-back-gray/80 hidden lg:static lg:flex py-2 lg:py-0 lg:px-2 lg:rounded-full"
      >
        {data.map((item, index) => (
          <li
            key={`${item.link}-${index}`}
            className="relative group lg:flex lg:items-center"
          >
            <Link
              href={item.link ?? ""}
              className="lg:relative leading-10 lg:z-20 px-4 lg:flex lg:items-center"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
