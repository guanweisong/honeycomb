import { UserEntity } from "@/src/app/(root)/(dashboard)/user/types/user.entity";
import { BaseResponse } from "@/src/types/BaseResponse";
import request from "@/src/utils/request";

export default class CommonService {
  static queryUser = (): Promise<BaseResponse<UserEntity>> => {
    return request({
      url: "/auth/queryUser",
      method: "get",
    });
  };
}
