"use client";

import { trpc } from "@/packages/trpc/client/trpc";

export function getMenuQueryInputs() {
  return {
    page: { limit: 9999 },
    category: { limit: 9999 },
    menu: undefined,
  } as const;
}

export function useMenuQuery() {
  const input = getMenuQueryInputs();
  const pageQuery = trpc.page.adminIndex.useQuery(input.page);
  const categoryQuery = trpc.category.adminIndex.useQuery(input.category);
  const menuQuery = trpc.menu.adminIndex.useQuery(input.menu);

  return {
    pageList: pageQuery.data,
    categoryList: categoryQuery.data,
    checkedData: menuQuery.data,
    refetchMenu: menuQuery.refetch,
  };
}
/**
 * 菜单管理查询 Hook，负责菜单树数据和查询参数。
 */
