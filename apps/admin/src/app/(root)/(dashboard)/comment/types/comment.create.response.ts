import type { BaseResponse } from "@/src/types/BaseResponse";
import type { CommentEntity } from "./comment.entity";

export interface CommentCreateResponse extends BaseResponse<CommentEntity> {}
