import type { BaseResponse } from "@/src/types/BaseResponse";
import type { SettingEntity } from "./setting.entity";

export interface SettingQueryResponse extends BaseResponse<SettingEntity[]> {}
