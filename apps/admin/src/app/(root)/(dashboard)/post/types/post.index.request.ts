import type { PaginationRequest } from "@/src/types/PaginationRequest";
import type { PostStatus } from "./PostStatus";
import type { PostType } from "./PostType";

export interface PostIndexRequest extends PaginationRequest {
  title?: string;
  type?: PostType[];
  status?: PostStatus[];
}
