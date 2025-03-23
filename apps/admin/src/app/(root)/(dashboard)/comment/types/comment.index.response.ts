import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { CommentEntity } from "./comment.entity";

export interface CommentIndexResponse
  extends PaginationResponse<CommentEntity[]> {}
