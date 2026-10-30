"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const AdminLayoutHeaderContext = createContext<{
  actions: HTMLElement | null;
  title: HTMLElement | null;
} | null>(null);

/** 页面拥有标题、操作及其当前回调；布局只提供稳定的头部 DOM 位置。 */
export function AdminPageHeader({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) {
  const targets = useContext(AdminLayoutHeaderContext);
  return (
    <>
      {targets?.title ? createPortal(title, targets.title) : null}
      {targets?.actions ? createPortal(children, targets.actions) : null}
    </>
  );
}
