import "server-only";

import { cache } from "react";
import type { SettingViewModel as SettingEntity } from "@/features/contracts";
import { createServerClient } from "@/packages/trpc/api";
import { getPublicSetting } from "./public-queries";

const getSiteSettingWithHeaders = cache(
  async (headers?: Headers): Promise<SettingEntity> => {
    const serverClient = await createServerClient(headers);
    return serverClient.setting.index();
  },
);

/** 公开读取走统一请求缓存；显式请求头仅用于登录页等请求绑定场景。 */
export const getSiteSetting = (headers?: Headers): Promise<SettingEntity> =>
  headers ? getSiteSettingWithHeaders(headers) : getPublicSetting();
