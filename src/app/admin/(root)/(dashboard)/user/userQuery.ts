"use client";

import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import type { UserListQueryInput } from "@/packages/trpc/api/modules/user/schemas/user.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";

export function useUserQuery() {
  const [searchParams, setSearchParams] = useState<UserListQueryInput>({});
  const query = trpc.user.index.useQuery(searchParams, {
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
