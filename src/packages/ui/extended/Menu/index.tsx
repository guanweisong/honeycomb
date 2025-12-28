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
}

export const Menu = (props: MenuProps) => {
  const pathname = usePathname();
  const { data = [] } = props;
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
              className={clsx({
                "pl-3": depth === 0,
                "pl-8": depth === 1,
                "pl-16": depth === 2,
                "pl-24": depth === 3,
                "pl-32": depth === 4,
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
