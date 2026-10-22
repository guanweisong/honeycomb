import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { PageListQuerySchema } from "../schemas/page.list-query.schema";

export type PageVisibility = "PUBLISHED_ONLY" | "ALL";

export type PageInput = PaginationInput & {
  title?: string;
  content?: string;
  status?: string[];
};

export type PageListQueryInput = z.output<typeof PageListQuerySchema>;
