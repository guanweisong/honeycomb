import type { EnableStatus } from "@/lib/validation/enable-status";

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
