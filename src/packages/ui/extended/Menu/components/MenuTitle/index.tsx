"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { usePathname } from "next/navigation";
import { MenuItem } from "../../index";

export interface MenuTitleProps {
  item: MenuItem;
  openMenus: string[];
  toggleMenu?: (path: string) => void;
  className?: string;
  style?: React.CSSProperties;
  collapsed?: boolean;
}

export const MenuTitle = (props: MenuTitleProps) => {
  const {
    item,
    openMenus,
    toggleMenu,
    className = "",
    style,
    collapsed = false,
  } = props;
  const pathname = usePathname();

  const content = (
    <div className="flex items-center gap-2 w-full min-w-0">
      <span>{item.icon}</span>
      {!collapsed && <span className="text-sm truncate">{item.name}</span>}
    </div>
  );

  const indicator = (
    <span className="text-xs text-gray-500 shrink-0">
      {openMenus.includes(item.path) ? (
        <ChevronDown
          strokeWidth={1.5}
          size={18}
          className="transition rotate-180"
        />
      ) : (
        <ChevronDown strokeWidth={1.5} size={18} className="transition" />
      )}
    </span>
  );

  const containerClass = cn(
    `flex justify-between items-center cursor-pointer transition rounded-sm hover:bg-gray-200 px-3 my-1.5 py-2`,
    { "!bg-gray-800 text-white": pathname === item.path },
    className,
  );

  return item.children ? (
    <div
      style={style}
      className={containerClass}
      onClick={() => toggleMenu?.(item.path)}
    >
      {content}
      {indicator}
    </div>
  ) : (
    <Link className={containerClass} href={item.path}>
      {content}
    </Link>
  );
};
