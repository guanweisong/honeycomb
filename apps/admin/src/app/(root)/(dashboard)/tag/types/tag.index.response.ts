import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { TagEntity } from "./tag.entity";

export interface TagIndexResponse extends PaginationResponse<TagEntity[]> {}
