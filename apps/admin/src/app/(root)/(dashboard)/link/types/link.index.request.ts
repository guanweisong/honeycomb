import type { EnableType } from "@/src/types/EnableType";
import type { PaginationRequest } from "@/src/types/PaginationRequest";

export interface LinkIndexRequest extends PaginationRequest {
  url?: string;
  name?: string;
  status?: EnableType[];
}
