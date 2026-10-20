import { keepPreviousData } from "@tanstack/react-query";

export const adminListQueryOptions = {
  placeholderData: keepPreviousData,
  staleTime: 60_000,
} as const;
