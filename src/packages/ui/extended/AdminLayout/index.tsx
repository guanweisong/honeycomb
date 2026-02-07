"use client";

import React, { ReactNode } from "react";
import { Avatar } from "../../components/avatar";
import { Menu, MenuItem } from "../Menu";
import { UserDropdown } from "../UserDropdown";
import { UserEntity } from "@/packages/trpc/server/types/user.entity";

export interface AdminLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
  menu?: MenuItem[];
  user?: UserEntity | null;
  onLogout: () => void;
}

export const AdminLayout = (props: AdminLayoutProps) => {
  const { children, title, footer, menu = [], user, onLogout } = props;

  return (
    <div className="h-screen flex box-border p-[1px] bg-gray-100">
      <div className="w-[200px] shrink-0 box-border m-3 flex flex-col">
        <div className="flex items-center">
          <Avatar url="/logo.jpg" fallback={title} />
          <span className="ml-3">{title}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Menu data={menu} />
        </div>
        <UserDropdown user={user} onLogout={onLogout} />
      </div>
      <div className="my-3 mr-3 flex flex-col bg-white rounded-lg shadow flex-1">
        <div className="box-border p-3 flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="text-gray-400 text-center p-3">{footer}</div>
        )}
      </div>
    </div>
  );
};
