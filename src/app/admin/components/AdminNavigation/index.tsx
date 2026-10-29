"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavigationItem } from "@/app/admin/components/AdminNavigation/NavigationItem";
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
  pendingPath?: string | null;
  onNavigateStart?: (path: string) => void;
}

export const AdminNavigation = (props: AdminNavigationProps) => {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const { data = [], pendingPath, onNavigateStart } = props;
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

      return (
        <div key={item.path}>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -16 }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.25, delay }
            }
          >
            <NavigationItem
              item={item}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
              isPending={pendingPath === item.path}
              onNavigateStart={onNavigateStart}
              className={clsx({
                "pl-3": depth === 0,
                "pl-8": depth === 1,
                "pl-16": depth === 2,
                "pl-24": depth === 3,
                "pl-32": depth === 4,
              })}
            />
          </motion.div>
          {item.children && isOpen && (
            <motion.div
              initial={reducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
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
