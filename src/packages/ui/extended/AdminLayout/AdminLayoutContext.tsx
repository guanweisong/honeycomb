"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
} from "react";

export const AdminLayoutActionsContext = createContext<{
  setActions: (actions: ReactNode | null) => void;
} | null>(null);

export const AdminLayoutPageTitleContext = createContext<{
  setPageTitle: (pageTitle: ReactNode | null) => void;
} | null>(null);

/** 将页面级操作同步到 AdminLayout 的统一头部。 */
export function useAdminLayoutActions(actions: ReactNode | null, key: string) {
  const context = useContext(AdminLayoutActionsContext);
  const setActions = context?.setActions;
  const syncActions = useEffectEvent(() => setActions?.(actions));
  const clearActions = useEffectEvent(() => setActions?.(null));

  useEffect(() => {
    if (!setActions) return;
    syncActions();
    return () => clearActions();
  }, [setActions, key]);
}

/** 将页面级标题同步到 AdminLayout 的统一头部。 */
export function useAdminLayoutPageTitle(
  pageTitle: ReactNode | null,
  key: string,
) {
  const context = useContext(AdminLayoutPageTitleContext);
  const setPageTitle = context?.setPageTitle;
  const syncPageTitle = useEffectEvent(() => setPageTitle?.(pageTitle));
  const clearPageTitle = useEffectEvent(() => setPageTitle?.(null));

  useEffect(() => {
    if (!setPageTitle) return;
    syncPageTitle();
    return () => clearPageTitle();
  }, [setPageTitle, key]);
}
