import "server-only";

import { cache } from "react";
import type { SettingViewModel as SettingEntity } from "@/features/contracts";
import { createServerClient } from "@/packages/trpc/api";

export const getSiteSetting = cache(
  async (headers?: Headers): Promise<SettingEntity> => {
    const serverClient = await createServerClient(headers);
    return serverClient.setting.index();
  },
);
