import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { CategoryListQuerySchema } from "@/features/category/schemas/category.list.schema";

export type CategoryListInput = PaginationInput &
  Pick<
    z.output<typeof CategoryListQuerySchema>,
    "id" | "title" | "path" | "status"
  >;

export type CategoryVisibility = "PUBLIC_ONLY" | "ALL";
