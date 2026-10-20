"use client";

import { trpc } from "@/lib/trpc/client/trpc";

export function usePageEditorQuery(id: string | null) {
  const query = trpc.page.adminDetail.useQuery(
    { id: id ?? "" },
    {
      enabled: !!id,
    },
  );

  return { data: query.data, refetch: query.refetch, error: query.error };
}
/**
 * 页面编辑查询 Hook，负责页面详情和编辑查询参数。
 */
