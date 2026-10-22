import type { link } from "@/lib/db/schema/content-link";
import type { EnableStatus } from "@/lib/validation/enable-status";

// Fixed public fields: adding a database column must not expand this contract.
export type LinkRecord = Pick<
  typeof link.$inferSelect,
  "id" | "url" | "name" | "logo" | "description" | "createdAt" | "updatedAt"
> & {
  status: EnableStatus | null;
};
