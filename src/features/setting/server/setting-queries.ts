import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import { toSettingRecord } from "@/features/setting/server/setting-translations";

/** 单条关系查询取得设置版本与翻译，不为读取快照持有交互式写事务。 */
export async function getSetting(db: Database) {
  const setting = await observeDbOperation("setting.get", "select", () =>
    db.query.setting.findFirst({
      where: eq(schema.setting.singletonKey, 1),
      with: { translations: true },
    }),
  );
  if (!setting) return undefined;
  return toSettingRecord(setting, setting.translations);
}
