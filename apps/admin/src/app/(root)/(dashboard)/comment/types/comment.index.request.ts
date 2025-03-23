import type { PaginationRequest } from "@/src/types/PaginationRequest";
import type { CommentStatus } from "./CommentStatus";

export interface CommentIndexRequest extends PaginationRequest {
  status?: CommentStatus[];
  content?: string;
}
