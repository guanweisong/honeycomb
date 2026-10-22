import type { TagListQuerySchema } from "@/features/tag/schemas/tag.list.schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";

// Repository options omit explicit undefined even with exact optional types.
export type TagListInput = PaginationInput & {
  [Key in keyof Omit<TagListQueryInput, keyof PaginationInput>]: Exclude<
    TagListQueryInput[Key],
    undefined
  >;
};

export type TagListQueryInput = z.output<typeof TagListQuerySchema>;
