import type { BaseResponse } from "@/src/types/BaseResponse";
import request from "@/src/utils/request";
import type { CommentCreateResponse } from "./types/comment.create.response";
import type { CommentEntity } from "./types/comment.entity";
import type { CommentIndexRequest } from "./types/comment.index.request";
import type { CommentIndexResponse } from "./types/comment.index.response";

export default class CommentService {
  static index = (
    params?: CommentIndexRequest,
  ): Promise<CommentIndexResponse> => {
    console.log("comments=>service=>index", params);
    return request({
      url: "/comment",
      method: "get",
      params,
    });
  };

  static create = (
    params: Omit<CommentEntity, "id">,
  ): Promise<CommentCreateResponse> => {
    console.log("comments=>service=>create", params);
    return request({
      url: "/comment",
      method: "post",
      data: params,
    });
  };

  static destroy = (ids: string[]): Promise<BaseResponse<null>> => {
    console.log("comments=>service=>distory", ids);
    return request({
      url: `/comment`,
      method: "delete",
      params: { ids },
    });
  };

  static update = (
    id: string,
    params: Partial<Omit<CommentEntity, "id">>,
  ): Promise<CommentCreateResponse> => {
    console.log("comments=>service=>update", id, params);
    return request({
      url: `/comment/${id}`,
      method: "patch",
      data: params,
    });
  };
}
