import type { PaginationInput } from "@/packages/application/pagination";
import type { EnableStatus } from "@/packages/domain/shared/enable-status";
import type {
  LinkInsert as LinkInsertInput,
  LinkUpdate as LinkUpdateInput,
} from "./write-schema";

export type LinkInsert = LinkInsertInput;
export type LinkUpdate = LinkUpdateInput;
export type LinkListInput = PaginationInput & {
  name?: string;
  url?: string;
  description?: string;
  status?: EnableStatus[];
};
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
export interface LinkRepository {
  create(input: LinkInsert): Promise<LinkRecord>;
  update(input: LinkUpdate): Promise<LinkRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(
    input: LinkListInput,
    visibility: LinkVisibility,
  ): Promise<{ list: LinkRecord[]; total: number }>;
}
