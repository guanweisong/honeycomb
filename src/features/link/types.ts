import type {
  LinkInsertSchema,
  LinkUpdateSchema,
  LinkListQuerySchema,
} from "./schema";
import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { EnableStatus } from "@/lib/validation/enable-status";

export type LinkListInput = PaginationInput &
  Omit<LinkListQueryInput, keyof PaginationInput>;
export type LinkVisibility = "PUBLIC_ONLY" | "ALL";
export type LinkRecord = {
  id: string;
  url: string;
  name: string;
  logo: string;
  description: string | null;
  status: EnableStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LinkInsert = z.output<typeof LinkInsertSchema>;
export type LinkUpdate = z.output<typeof LinkUpdateSchema>;
export type LinkListQueryInput = z.output<typeof LinkListQuerySchema>;
