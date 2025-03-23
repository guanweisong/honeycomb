import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { PostEntity } from "./post.entity";

export interface PostIndexResponse extends PaginationResponse<PostEntity[]> {}
