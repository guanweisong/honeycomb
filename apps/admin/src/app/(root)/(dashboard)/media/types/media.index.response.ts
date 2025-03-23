import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { MediaEntity } from "./media.entity";

export interface MediaIndexResponse extends PaginationResponse<MediaEntity[]> {}
