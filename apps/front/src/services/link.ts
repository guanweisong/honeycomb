import request from "@/utils/request";
import PaginationResponse from "@/types/pagination.response";
import { cache } from "react";
import { LinkEntity } from "@/types/link/link.entity";
import { LinkListQuery } from "@/types/link/link.list.query";

export default class LinkServer {
  // 获取菜单列表
  static index = cache(
    (params: LinkListQuery): Promise<PaginationResponse<LinkEntity>> => {
      console.log("menu=>service=>indexMenu");
      // @ts-ignore
      return request({
        url: "/link",
        method: "get",
        params,
      });
    },
  );
}
