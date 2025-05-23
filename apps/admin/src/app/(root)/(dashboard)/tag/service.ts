import type { BaseResponse } from "@/src/types/BaseResponse";
import request from "@/src/utils/request";
import type { TagCreateResponse } from "./types/tag.create.response";
import type { TagEntity } from "./types/tag.entity";
import type { TagIndexRequest } from "./types/tag.index.request";
import type { TagIndexResponse } from "./types/tag.index.response";

export default class TagService {
  static index = (params?: TagIndexRequest): Promise<TagIndexResponse> => {
    console.log("tags=>service=>index", params);
    return request({
      url: "/tag",
      method: "get",
      params,
    });
  };

  static create = (
    params: Omit<TagEntity, "id" | "createdAt" | "updatedAt">,
  ): Promise<TagCreateResponse> => {
    console.log("tags=>service=>create", params);
    return request({
      url: "/tag",
      method: "post",
      data: params,
    });
  };

  static destroy = (ids: string[]): Promise<BaseResponse<null>> => {
    console.log("tags=>service=>destroy", ids);
    return request({
      url: `/tag`,
      params: { ids },
      method: "delete",
    });
  };

  static update = (
    id: string,
    params: Partial<Omit<TagEntity, "id">>,
  ): Promise<TagCreateResponse> => {
    console.log("tags=>service=>update", id, params);
    return request({
      url: `/tag/${id}`,
      method: "patch",
      data: params,
    });
  };
}
