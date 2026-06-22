"use client";

import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import Avatar from "../Avatar";
import { Menu, MenuItem } from "../Menu";
import { UserDropdown } from "../UserDropdown";
import { CurrentUser } from "@/packages/trpc/api/modules/user/types/user.entity";
import { Button } from "../../components/button";
import { PanelLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePathname } from "next/navigation";

export interface AdminLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  pageTitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  menu?: MenuItem[];
  user?: CurrentUser | null;
  onLogout: () => void;
}

const AdminLayoutActionsContext = createContext<{
  setActions: (actions: ReactNode | null) => void;
} | null>(null);

const AdminLayoutPageTitleContext = createContext<{
  setPageTitle: (pageTitle: ReactNode | null) => void;
} | null>(null);

export function useAdminLayoutActions(
  actions: ReactNode | null,
  key: string,
) {
  const context = useContext(AdminLayoutActionsContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setActions(actions);
    return () => context.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, key]);
}

export function useAdminLayoutPageTitle(pageTitle: ReactNode | null, key: string) {
  const context = useContext(AdminLayoutPageTitleContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setPageTitle(pageTitle);
    return () => context.setPageTitle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, key]);
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "admin-sidebar-collapsed";
const SIDEBAR_COLLAPSE_BREAKPOINT = 768;

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
  } = props;
  const pathname = usePathname();
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

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed),
    );
  }, [collapsed]);

  const resolvedPageTitle =
    pageTitle ?? findMenuTitle(menu, pathname) ?? title;
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [headerPageTitle, setHeaderPageTitle] = useState<ReactNode | null>(null);
  const resolvedHeaderPageTitle = headerPageTitle ?? resolvedPageTitle;

  return (
    <AdminLayoutActionsContext.Provider value={{ setActions: setHeaderActions }}>
      <AdminLayoutPageTitleContext.Provider
        value={{ setPageTitle: setHeaderPageTitle }}
      >
        <div className="relative h-screen box-border bg-gray-100 p-[1px]">
          <div className="h-full flex">
            <div
              data-testid="admin-sidebar"
              className={cn(
                "shrink-0 box-border flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
                collapsed
                  ? "w-0 opacity-0 translate-x-[-8px] ml-0 my-3 pointer-events-none"
                  : "w-[200px] opacity-100 translate-x-0 m-3",
              )}
            >
              <div className="flex items-center gap-3 p-3">
                <Avatar url="/logo.jpg" fallback={title} />
                <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                  {title}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-2">
                <Menu data={menu} />
              </div>
              <div className="p-3 pt-0">
                <UserDropdown user={user} onLogout={onLogout} />
              </div>
            </div>
            <div
              className={cn(
                "my-3 mr-3 flex min-w-0 flex-1 flex-col rounded-lg bg-white shadow transition-all duration-300 ease-in-out",
                collapsed && "ml-3",
              )}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() => setCollapsed((prev) => !prev)}
                  aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
                >
                  <PanelLeft />
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
              <div className="box-border flex-1 min-h-0 overflow-y-auto px-4 py-3">
                {children}
              </div>
              {footer && (
                <div className="text-gray-400 text-center p-3">{footer}</div>
              )}
            </div>
          </div>
        </div>
      </AdminLayoutPageTitleContext.Provider>
    </AdminLayoutActionsContext.Provider>
  );
};
