"use client";

import { trpc } from "@/packages/trpc/client/trpc";
import { MAX_PAGE_SIZE } from "@/packages/application/resource-limits";

export function getMenuQueryInputs() {
  return {
    page: { limit: MAX_PAGE_SIZE },
    category: undefined,
    menu: undefined,
  } as const;
}

export function useMenuQuery() {
  const input = getMenuQueryInputs();
  const pageQuery = trpc.page.adminIndex.useQuery(input.page);
  const remainingPages = trpc.useQueries((query) =>
    Array.from(
      {
        length: Math.max(
          0,
          Math.ceil((pageQuery.data?.total ?? 0) / MAX_PAGE_SIZE) - 1,
        ),
      },
      (_, index) =>
        query.page.adminIndex({ page: index + 2, limit: MAX_PAGE_SIZE }),
    ),
  );
  const categoryQuery = trpc.category.adminTree.useQuery(input.category);
  const menuQuery = trpc.menu.adminIndex.useQuery(input.menu);

  return {
    pageList: pageQuery.data
      ? {
          ...pageQuery.data,
          list: [
            ...pageQuery.data.list,
            ...remainingPages.flatMap((page) => page.data?.list ?? []),
          ],
        }
      : undefined,
    categoryList: categoryQuery.data,
    checkedData: menuQuery.data,
    pageLoading:
      pageQuery.isLoading || remainingPages.some((page) => page.isLoading),
    categoryLoading: categoryQuery.isLoading,
    menuLoading: menuQuery.isLoading,
    refetchMenu: menuQuery.refetch,
  };
}
/**
 * 菜单管理查询 Hook，负责菜单树数据和查询参数。
 */
