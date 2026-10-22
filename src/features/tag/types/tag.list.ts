import type { TagListQuerySchema } from "@/features/tag/schema/tag.list.schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";

export type TagListInput = PaginationInput & {
  id?: string[];
  name?: string;
};

export type TagListQueryInput = z.output<typeof TagListQuerySchema>;
