"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import type { LinkListQueryInput } from "@/packages/trpc/api/modules/link/schemas/link.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";
import { buildLinkQueryParams } from "./linkTransforms";

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
    setSearchParams: (params: LinkListQueryInput) =>
      setSearchParams(buildLinkQueryParams(params)),
  };
}
