import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { PageListQuerySchema } from "@/features/page/schemas/page.list-query.schema";

export type PageVisibility = "PUBLISHED_ONLY" | "ALL";

// Repository options omit explicit undefined even with exact optional types.
export type PageInput = PaginationInput & {
  [Key in keyof Omit<PageListQueryInput, keyof PaginationInput>]: Exclude<
    PageListQueryInput[Key],
    undefined
  >;
};

export type PageListQueryInput = z.output<typeof PageListQuerySchema>;
