"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MenuTitle } from "./MenuTitle";
import { motion } from "motion/react";
import { clsx } from "clsx";

export interface MenuItem {
  name: string;
  icon?: React.ReactNode;
  path: string;
  children?: MenuItem[];
}

export interface MenuProps {
  data?: MenuItem[];
  collapsed?: boolean;
  pendingPath?: string | null;
  onNavigateStart?: (path: string) => void;
}

export const Menu = (props: MenuProps) => {
  const pathname = usePathname();
  const { data = [], collapsed = false, pendingPath, onNavigateStart } = props;
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  useEffect(() => {
    const activeGroups: string[] = [];
    const visit = (items: MenuItem[]): boolean => {
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

  const renderMenu = (menuItems: MenuItem[], depth: number = 0) => {
    return menuItems.map((item, index) => {
      const isOpen = openMenus.includes(item.path);
      const delay = index * 0.05;
      const exitDelay = (menuItems.length - index - 1) * 0.05;

      return (
        <div key={item.path}>
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { duration: 0.25, delay },
            }}
            exit={{
              opacity: 0,
              x: -16,
              transition: { duration: 0.25, delay: exitDelay },
            }}
          >
            <MenuTitle
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
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
