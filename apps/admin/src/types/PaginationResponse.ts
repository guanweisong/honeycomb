import type { BaseResponse } from "@/src/types/BaseResponse";

export interface PaginationResponse<T>
  extends BaseResponse<{
    total: number;
    list: T;
  }> {}
