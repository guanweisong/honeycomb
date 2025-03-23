import type { BaseResponse } from "@/src/types/BaseResponse";
import type { PostEntity } from "./post.entity";

export interface PostCreateResponse extends BaseResponse<PostEntity> {}
