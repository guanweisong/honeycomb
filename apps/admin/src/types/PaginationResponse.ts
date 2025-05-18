import type { BaseResponse } from "@/types/BaseResponse";

export type PaginationResponse<T> = BaseResponse<{
  total: number;
  list: T[];
}>;
