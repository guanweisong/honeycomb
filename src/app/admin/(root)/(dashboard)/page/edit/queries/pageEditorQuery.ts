"use client";

import { trpc } from "@/packages/trpc/client/trpc";

export function getPageEditorQueryInput(id: string | null) {
  return { id: id as string };
}

export function usePageEditorQuery(id: string | null) {
  const query = trpc.page.adminDetail.useQuery(getPageEditorQueryInput(id), {
    enabled: !!id,
  });

  return { data: query.data, refetch: query.refetch };
}
/**
 * 页面编辑查询 Hook，负责页面详情和编辑查询参数。
 */
