import { SortOrder } from "@/src/types/SortOrder";

export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: SortOrder;
}
