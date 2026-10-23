"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import LoadingState from "@/components/LoadingState";
import { usePathname } from "next/navigation";
import type { AdminNavigationItem } from "./index";

export interface NavigationItemProps {
  item: AdminNavigationItem;
  openMenus: string[];
  toggleMenu?: (path: string) => void;
  className?: string;
  style?: React.CSSProperties;
  collapsed?: boolean;
  isPending?: boolean;
  onNavigateStart?: (path: string) => void;
}

export const NavigationItem = (props: NavigationItemProps) => {
  const {
    item,
    openMenus,
    toggleMenu,
    className = "",
    style,
    collapsed = false,
    isPending = false,
    onNavigateStart,
  } = props;
  const pathname = usePathname();

  const content = (
    <span className="flex items-center gap-2 w-full min-w-0">
      <span>{item.icon}</span>
      {!collapsed && <span className="truncate text-sm">{item.name}</span>}
      {isPending && (
        <LoadingState
          variant="inline"
          label={`正在打开${item.name}`}
          visuallyHiddenLabel
          className="ml-auto shrink-0 text-current"
        />
      )}
    </span>
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
    `flex w-full text-left justify-between items-center cursor-pointer transition-colors rounded-sm hover:bg-gray-200 px-3 my-1.5 py-2`,
    { "!bg-gray-800 text-white": pathname === item.path },
    className,
  );

  return item.children ? (
    <button
      type="button"
      aria-label={item.name}
      aria-expanded={openMenus.includes(item.path)}
      style={style}
      className={containerClass}
      onClick={() => toggleMenu?.(item.path)}
    >
      {content}
      {indicator}
    </button>
  ) : (
    <Link
      className={containerClass}
      aria-label={item.name}
      aria-current={pathname === item.path ? "page" : undefined}
      href={item.path}
      prefetch="auto"
      onNavigate={() => onNavigateStart?.(item.path)}
    >
      {content}
    </Link>
  );
};
/**
 * Admin 菜单标题扩展组件，负责统一菜单标题的展示样式。
 */
