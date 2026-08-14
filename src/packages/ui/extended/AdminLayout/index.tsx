"use client";

import React, {
  ReactNode,
  useEffect,
  useState,
} from "react";
import { MenuItem } from "../Menu";
import type { CurrentUser } from "@/packages/domain/identity/user";
import { Button } from "../../components/button";
import { Menu as MenuIcon, PanelLeft, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePathname } from "next/navigation";
import {
  AdminLayoutActionsContext,
  AdminLayoutPageTitleContext,
} from "./AdminLayoutContext";
import { AdminSidebar } from "./AdminSidebar";

export {
  useAdminLayoutActions,
  useAdminLayoutPageTitle,
} from "./AdminLayoutContext";

export interface AdminLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  pageTitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  menu?: MenuItem[];
  user?: CurrentUser | null;
  onLogout: () => void;
  onNavigate?: (path: string) => void;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "admin-sidebar-collapsed";
const SIDEBAR_COLLAPSE_BREAKPOINT = 768;

const getInitialIsMobile = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(`(max-width: ${SIDEBAR_COLLAPSE_BREAKPOINT}px)`)
    .matches;
};

const findMenuTitle = (
  items: MenuItem[],
  pathname: string,
): string | undefined => {
  for (const item of items) {
    if (pathname === item.path) {
      return item.name;
    }

    if (item.children) {
      const childTitle = findMenuTitle(item.children, pathname);
      if (childTitle) {
        return childTitle;
      }
    }

    if (pathname.startsWith(`${item.path}/`)) {
      return item.name;
    }
  }

  return undefined;
};

export const AdminLayout = (props: AdminLayoutProps) => {
  const {
    children,
    title,
    pageTitle,
    actions,
    footer,
    menu = [],
    user,
    onLogout,
    onNavigate,
  } = props;
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(getInitialIsMobile);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (saved !== null) {
      return saved === "true";
    }

    return window.matchMedia(`(max-width: ${SIDEBAR_COLLAPSE_BREAKPOINT}px)`)
      .matches;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed),
    );
  }, [collapsed]);

  useEffect(() => {
    const media = window.matchMedia(
      `(max-width: ${SIDEBAR_COLLAPSE_BREAKPOINT}px)`,
    );

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(media.matches);
    media.addEventListener?.("change", handleChange);

    return () => {
      media.removeEventListener?.("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [pathname, isMobile]);

  const resolvedPageTitle = pageTitle ?? findMenuTitle(menu, pathname) ?? title;
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [headerPageTitle, setHeaderPageTitle] = useState<ReactNode | null>(
    null,
  );
  const [actionsContext] = useState(() => ({
    setActions: (nextActions: ReactNode | null) =>
      setHeaderActions(nextActions),
  }));
  const [pageTitleContext] = useState(() => ({
    setPageTitle: (nextPageTitle: ReactNode | null) =>
      setHeaderPageTitle(nextPageTitle),
  }));
  const resolvedHeaderPageTitle = headerPageTitle ?? resolvedPageTitle;
  const isDrawerOpen = isMobile && mobileMenuOpen;
  const sidebarButtonLabel = isMobile
    ? mobileMenuOpen
      ? "关闭侧边栏"
      : "打开侧边栏"
    : collapsed
      ? "展开侧边栏"
      : "收起侧边栏";
  const sidebarButtonIcon = isMobile ? (
    mobileMenuOpen ? (
      <X />
    ) : (
      <MenuIcon />
    )
  ) : (
    <PanelLeft />
  );

  return (
    <AdminLayoutActionsContext.Provider value={actionsContext}>
      <AdminLayoutPageTitleContext.Provider value={pageTitleContext}>
        <div className="relative h-screen box-border bg-gray-100 p-[1px]">
          <div className="h-full flex">
            {!isMobile && (
              <div
                data-testid="admin-sidebar"
                className={cn(
                  "shrink-0 box-border flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
                  collapsed
                    ? "w-0 opacity-0 translate-x-[-8px] ml-0 my-3 pointer-events-none"
                    : "w-[200px] opacity-100 translate-x-0 m-3",
                )}
              >
                <AdminSidebar title={title} menu={menu} user={user} onLogout={onLogout} onNavigate={onNavigate} />
              </div>
            )}
            <div
              className={cn(
                "my-3 mr-3 flex min-w-0 flex-1 flex-col rounded-lg bg-white shadow transition-all duration-300 ease-in-out",
                !isMobile && collapsed && "ml-3",
                isMobile && "m-3",
              )}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() =>
                    isMobile
                      ? setMobileMenuOpen((prev) => !prev)
                      : setCollapsed((prev) => !prev)
                  }
                  aria-label={sidebarButtonLabel}
                >
                  {sidebarButtonIcon}
                </Button>
                <div className="min-w-0">
                  <div
                    data-testid="admin-page-title"
                    className="truncate text-base font-medium text-gray-900"
                  >
                    {resolvedHeaderPageTitle}
                  </div>
                </div>
                {(actions || headerActions) && (
                  <div className="ml-auto flex flex-wrap gap-3">
                    {actions}
                    {headerActions}
                  </div>
                )}
              </div>
              <div className="relative box-border flex-1 min-h-0 overflow-y-auto px-4 py-3">
                {children}
              </div>
              {footer && (
                <div className="text-gray-400 text-center p-3">{footer}</div>
              )}
            </div>
            {isMobile && (
              <>
                <button
                  type="button"
                  aria-label="关闭侧边栏"
                  aria-hidden={!isDrawerOpen}
                  tabIndex={isDrawerOpen ? 0 : -1}
                  className={cn(
                    "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
                    isDrawerOpen
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div
                  data-testid="admin-sidebar-drawer"
                  className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] box-border flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out",
                    isDrawerOpen
                      ? "translate-x-0"
                      : "translate-x-[-100%] pointer-events-none",
                  )}
                >
                  <AdminSidebar title={title} menu={menu} user={user} onLogout={onLogout} onNavigate={onNavigate} />
                </div>
              </>
            )}
          </div>
        </div>
      </AdminLayoutPageTitleContext.Provider>
    </AdminLayoutActionsContext.Provider>
  );
};
