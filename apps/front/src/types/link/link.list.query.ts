import { LinkStatus } from "@/types/link/LinkStatus";

export interface LinkListQuery {
  status?: LinkStatus[];
  page?: number;
  limit?: number;
}
