import request from "@/utils/request";
import { SettingEntity } from "@/types/setting/setting.entity";
import { cache } from "react";

export default class SettingServer {
  // 获取网站配置信息
  static indexSetting = cache((): Promise<SettingEntity> => {
    console.log("setting=>service=>indexSetting");
    return request({
      url: "/setting",
      method: "get",
    });
  });
}
