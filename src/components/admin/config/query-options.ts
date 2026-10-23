import { keepPreviousData } from "@tanstack/react-query";

export const adminListQueryOptions = {
  placeholderData: keepPreviousData,
  staleTime: 60_000,
} as const;

// Intent prefetch and editor consumers share the same freshness window.
export const adminDetailQueryOptions = { staleTime: 30_000 } as const;
