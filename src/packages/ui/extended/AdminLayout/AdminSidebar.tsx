"use client";

import type { ReactNode } from "react";
import Avatar from "../Avatar";
import { Menu, MenuItem } from "../Menu";
import { UserDropdown } from "../UserDropdown";
import type { CurrentUser } from "@/packages/domain/identity/user";

interface AdminSidebarProps {
  title?: ReactNode;
  menu: MenuItem[];
  user?: CurrentUser | null;
  onLogout: () => void;
}

/** Admin 侧边栏内容，桌面侧栏和移动抽屉共用。 */
export function AdminSidebar({
  title,
  menu,
  user,
  onLogout,
}: AdminSidebarProps) {
  return (
    <>
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
    </>
  );
}
