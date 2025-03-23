import type { BaseResponse } from "@/src/types/BaseResponse";

export interface LoginResponse
  extends BaseResponse<{ isOk: boolean; token: string }> {}
