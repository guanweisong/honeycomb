"use client";

import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { AdminNavigationItem } from "@/app/admin/components/AdminNavigation";
import type { CurrentUser } from "@/features/user/types/user.current";
import { Button } from "@/components/ui/button";
import { Menu as MenuIcon, PanelLeft, X } from "lucide-react";
import { cn } from "cn";
import { usePathname } from "next/navigation";
import { AdminLayoutHeaderContext } from "@/components/admin/layout-context";
import { AdminSidebar } from "@/app/admin/components/AdminLayout/AdminSidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { findMenuTitle } from "@/app/admin/components/AdminLayout/menu-title";

export interface AdminLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  pageTitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  menu?: AdminNavigationItem[];
  user?: CurrentUser | null;
  onLogout: () => void;
  pendingPath?: string | null;
  onNavigateStart?: (path: string) => void;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "admin-sidebar-collapsed";
const SIDEBAR_COLLAPSE_BREAKPOINT = 768;

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
    pendingPath,
    onNavigateStart,
  } = props;
  const pathname = usePathname();
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [layoutHydrated, setLayoutHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!layoutHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(collapsed),
      );
    } catch {
      // A blocked optional preference must not prevent layout interaction.
    }
  }, [collapsed, layoutHydrated]);

  useEffect(() => {
    const media = window.matchMedia(
      `(max-width: ${SIDEBAR_COLLAPSE_BREAKPOINT}px)`,
    );

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(media.matches);
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    } catch {
      // Keep the responsive default and still install the media listener.
    }
    setCollapsed(saved !== null ? saved === "true" : media.matches);
    setLayoutHydrated(true);
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
  const [actionsTarget, setActionsTarget] = useState<HTMLElement | null>(null);
  const [titleTarget, setTitleTarget] = useState<HTMLElement | null>(null);
  const headerTargets = useMemo(
    () => ({ actions: actionsTarget, title: titleTarget }),
    [actionsTarget, titleTarget],
  );
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
    <AdminLayoutHeaderContext.Provider value={headerTargets}>
      <div className="relative h-screen box-border bg-gray-100 p-[1px]">
        <div className="h-full flex">
          {!isMobile && (
            <div
              data-testid="admin-sidebar"
              inert={collapsed}
              aria-hidden={collapsed}
              className={cn(
                "shrink-0 box-border flex flex-col overflow-hidden transition-[width,opacity,translate,margin] duration-300 ease-in-out motion-reduce:transition-none",
                collapsed
                  ? "w-0 opacity-0 translate-x-[-8px] ml-0 my-3 pointer-events-none"
                  : "w-[200px] opacity-100 translate-x-0 m-3",
              )}
            >
              <AdminSidebar
                title={title}
                menu={menu}
                user={user}
                onLogout={onLogout}
                pendingPath={pendingPath}
                onNavigateStart={onNavigateStart}
              />
            </div>
          )}
          <div
            className={cn(
              "my-3 mr-3 flex min-w-0 flex-1 flex-col rounded-lg bg-white shadow transition-[margin] duration-300 ease-in-out motion-reduce:transition-none",
              !isMobile && collapsed && "ml-3",
              isMobile && "m-3",
            )}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <Button
                ref={sidebarToggleRef}
                type="button"
                aria-expanded={isMobile ? isDrawerOpen : !collapsed}
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
                  <span
                    ref={setTitleTarget}
                    data-slot="admin-header-title"
                    className="peer empty:hidden"
                  />
                  <span
                    data-slot="admin-header-title-fallback"
                    className="hidden peer-empty:inline"
                  >
                    {resolvedPageTitle}
                  </span>
                </div>
              </div>
              <div className="ml-auto hidden flex-wrap gap-3 has-[>:not(:empty)]:flex">
                <div className="contents">{actions}</div>
                <div
                  ref={setActionsTarget}
                  data-slot="admin-header-actions"
                  className="contents"
                />
              </div>
            </div>
            <div className="relative box-border flex-1 min-h-0 overflow-y-auto px-4 py-3">
              {children}
            </div>
            {footer && (
              <div className="text-gray-400 text-center p-3">{footer}</div>
            )}
          </div>
          {isMobile && (
            <Sheet open={isDrawerOpen} onOpenChange={setMobileMenuOpen}>
              <SheetContent
                side="left"
                showCloseButton={false}
                data-testid="admin-sidebar-drawer"
                inert={!isDrawerOpen}
                aria-hidden={!isDrawerOpen}
                aria-describedby={undefined}
                className="w-[280px] max-w-[85vw] gap-0 bg-white"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  sidebarToggleRef.current?.focus();
                }}
              >
                <SheetTitle className="sr-only">后台导航</SheetTitle>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                    aria-label="关闭侧边栏"
                  >
                    <X />
                  </Button>
                </SheetClose>
                <AdminSidebar
                  title={title}
                  menu={menu}
                  user={user}
                  onLogout={onLogout}
                  pendingPath={pendingPath}
                  onNavigateStart={onNavigateStart}
                />
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </AdminLayoutHeaderContext.Provider>
  );
};
