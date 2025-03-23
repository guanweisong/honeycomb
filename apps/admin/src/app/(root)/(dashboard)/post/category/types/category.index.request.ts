import { PaginationRequest } from "@/src/types/PaginationRequest";

export interface CategoryIndexRequest extends PaginationRequest {
  title?: string;
  path?: string;
}
