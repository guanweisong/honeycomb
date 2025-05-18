"use client";

import React, { ReactNode } from "react";
import { Avatar } from "@honeycomb/ui/components/avatar";
import { Menu, MenuItem } from "@honeycomb/ui/extended/Menu";
import { UserEntity } from "admin/src/app/(root)/(dashboard)/user/types/user.entity";
import { UserDropdown } from "@honeycomb/ui/extended/UserDropdown";
import { usePathname } from "next/navigation";

export interface AdminLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
  menu?: MenuItem[];
  user?: UserEntity | false;
  onLogout: () => void;
}

export const AdminLayout = (props: AdminLayoutProps) => {
  const { children, title, footer, menu = [], user, onLogout } = props;
  const pathname = usePathname();

  return (
    <div className="h-screen flex box-border p-[1px] bg-gray-100">
      <div className="w-[200px] shrink-0 box-border m-3 flex flex-col">
        <div className="flex items-center">
          <Avatar url="/logo.jpg" fallback={title} />
          <span className="ml-3">{title}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-scroll">
          <Menu data={menu} />
        </div>
        <UserDropdown user={user} onLogout={onLogout} />
      </div>
      <div className="my-3 mr-3 flex flex-col bg-white rounded-lg shadow flex-1">
        <div className="box-border p-3 flex-1 min-h-0 overflow-y-scroll">
          {children}
        </div>
        {footer && (
          <div className="text-gray-400 text-center p-3">{footer}</div>
        )}
      </div>
    </div>
  );
};
