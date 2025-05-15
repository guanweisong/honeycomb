import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { PageEntity } from "./page.entity";

export interface PageIndexListResponse extends PaginationResponse<PageEntity> {}
