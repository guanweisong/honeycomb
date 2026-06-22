"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MenuTitle } from "./components/MenuTitle";
import { motion, AnimatePresence } from "motion/react";
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
}

export const Menu = (props: MenuProps) => {
  const pathname = usePathname();
  const { data = [], collapsed = false } = props;
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  useEffect(() => {
    const pathnameArr = pathname.split("/");
    if (pathnameArr.length > 2) {
      setOpenMenus((prev) => [...new Set([...prev, `/${pathnameArr[1]}`])]);
    }
  }, [pathname]);

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
          <AnimatePresence>
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
          </AnimatePresence>
        </div>
      );
    });
  };

  return <div className="my-3">{renderMenu(data)}</div>;
};
