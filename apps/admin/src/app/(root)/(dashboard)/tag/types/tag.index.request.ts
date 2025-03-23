import type { PaginationRequest } from "@/src/types/PaginationRequest";

export interface TagIndexRequest extends PaginationRequest {
  name?: string;
}
