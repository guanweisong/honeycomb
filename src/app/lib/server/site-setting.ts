import "server-only";

import type { SettingEntity } from "@/packages/trpc/api/outputs";
import { createServerClient } from "@/packages/trpc/api";

export async function getSiteSetting(headers?: Headers): Promise<SettingEntity> {
  const serverClient = await createServerClient(headers);
  return serverClient.setting.index();
}
