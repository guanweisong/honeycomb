import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { UserEntity } from "./user.entity";

export interface UserIndexResponse extends PaginationResponse<UserEntity> {}
