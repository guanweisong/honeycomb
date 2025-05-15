import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { LinkEntity } from "./link.entity";

export interface LinkIndexResponse extends PaginationResponse<LinkEntity> {}
