import type { LinkListQuerySchema } from "@/features/link/schema/link.list.schema";
import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";

export type LinkListInput = PaginationInput &
  Omit<LinkListQueryInput, keyof PaginationInput>;

export type LinkVisibility = "PUBLIC_ONLY" | "ALL";

export type LinkListQueryInput = z.output<typeof LinkListQuerySchema>;
