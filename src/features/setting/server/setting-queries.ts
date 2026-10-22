import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import { toSettingRecord } from "./setting-translations";

/** 在同一读取事务中取得设置版本与翻译，避免拼接不同版本的编辑快照。 */
export async function getSetting(db: Database) {
  return db.transaction((tx) => readSetting(tx));
}

async function readSetting(db: Pick<Database, "select">) {
  const [setting] = await observeDbOperation("setting.get", "select", () =>
    db
      .select()
      .from(schema.setting)
      .where(eq(schema.setting.singletonKey, 1))
      .limit(1),
  );
  if (!setting) return undefined;
  const translations = await observeDbOperation("setting.get", "select", () =>
    db
      .select()
      .from(schema.settingTranslation)
      .where(eq(schema.settingTranslation.settingId, setting.id)),
  );
  return toSettingRecord(setting, translations);
}
