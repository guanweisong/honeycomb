"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavigationItem } from "@/app/admin/_components/AdminNavigation/NavigationItem";
import { motion, useReducedMotion } from "motion/react";
import { clsx } from "cn";

export interface AdminNavigationItem {
  name: string;
  icon?: React.ReactNode;
  path: string;
  children?: AdminNavigationItem[];
}

export interface AdminNavigationProps {
  data?: AdminNavigationItem[];
  collapsed?: boolean;
  pendingPath?: string | null;
  onNavigateStart?: (path: string) => void;
}

export const AdminNavigation = (props: AdminNavigationProps) => {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const { data = [], collapsed = false, pendingPath, onNavigateStart } = props;
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  useEffect(() => {
    const activeGroups: string[] = [];
    const visit = (items: AdminNavigationItem[]): boolean => {
      let hasActive = false;
      for (const item of items) {
        const activeChild = item.children ? visit(item.children) : false;
        const active =
          pathname === item.path || pathname.startsWith(`${item.path}/`);
        if (item.children && (activeChild || active))
          activeGroups.push(item.path);
        hasActive ||= activeChild || active;
      }
      return hasActive;
    };
    visit(data);
    setOpenMenus((prev) => {
      const next = [...new Set([...prev, ...activeGroups])];
      return next.length === prev.length ? prev : next;
    });
  }, [pathname, data]);

  const toggleMenu = (path: string) => {
    setOpenMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const renderMenu = (menuItems: AdminNavigationItem[], depth: number = 0) => {
    return menuItems.map((item, index) => {
      const isOpen = openMenus.includes(item.path);
      const delay = index * 0.05;
      const exitDelay = (menuItems.length - index - 1) * 0.05;

      return (
        <div key={item.path}>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -16 }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -16,
              transition: reducedMotion
                ? { duration: 0 }
                : { duration: 0.25, delay: exitDelay },
            }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.25, delay }
            }
          >
            <NavigationItem
              item={item}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
              collapsed={collapsed}
              isPending={pendingPath === item.path}
              onNavigateStart={onNavigateStart}
              className={clsx({
                "pl-3": depth === 0 && !collapsed,
                "pl-8": depth === 1 && !collapsed,
                "pl-16": depth === 2 && !collapsed,
                "pl-24": depth === 3 && !collapsed,
                "pl-32": depth === 4 && !collapsed,
                "justify-center px-2": collapsed,
              })}
            />
          </motion.div>
          {item.children && isOpen && (
            <motion.div
              initial={reducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.25 }}
              style={{ overflow: "hidden" }}
            >
              {renderMenu(item.children, depth + 1)}
            </motion.div>
          )}
        </div>
      );
    });
  };

  return <div className="my-3">{renderMenu(data)}</div>;
};
