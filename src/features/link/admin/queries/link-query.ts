"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import type { LinkListQueryInput } from "@/features/link/schemas/link.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";

export function useLinkQuery() {
  const [searchParams, setSearchParams] = useState<LinkListQueryInput>({});
  const query = trpc.link.adminIndex.useQuery(searchParams, {
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    setSearchParams,
  };
}
/**
 * 链接管理查询 Hook，负责链接列表查询和筛选参数。
 */
