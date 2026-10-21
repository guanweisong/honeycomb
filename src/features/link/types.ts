import type { PaginationInput } from "@/lib/validation/pagination";
import type { EnableStatus } from "@/lib/validation/enable-status";
import type {
  LinkListQueryInput,
  LinkInsert as LinkInsertInput,
  LinkUpdate as LinkUpdateInput,
} from "./schema";

export type LinkInsert = LinkInsertInput;
export type LinkUpdate = LinkUpdateInput;
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
