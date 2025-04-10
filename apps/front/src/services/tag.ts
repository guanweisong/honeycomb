import request from "@/src/utils/request";
import { TagListQuery } from "@/src/types/tag/tag.list.query";
import PaginationResponse from "@/src/types/pagination.response";
import { TagEntity } from "@/src/types/tag/tag.entity";
import { cache } from "react";

export default class TagServer {
  // 获取标签列表
  static indexList = cache(
    (params: TagListQuery): Promise<PaginationResponse<TagEntity[]>> => {
      console.log("category=>service=>indexTagList");
      return request({
        url: "/tag",
        method: "get",
        params: params,
      });
    },
  );
}
