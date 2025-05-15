import type { BaseResponse } from "@/src/types/BaseResponse";

export type PaginationResponse<T> = BaseResponse<{
  total: number;
  list: T[];
}>;
