import "server-only";
import { requireWriteResult } from "@/lib/db/value-validation";

import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import {
  assembleSettingTranslations,
  patchSettingTranslationRows,
} from "./server/setting-translations";
import type { SettingUpdate } from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";

function toSettingRecord(
  setting: typeof schema.setting.$inferSelect,
  translations: readonly (typeof schema.settingTranslation.$inferSelect)[],
) {
  return {
    id: setting.id,
    siteRecordNo: setting.siteRecordNo,
    siteRecordUrl: setting.siteRecordUrl,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
    ...assembleSettingTranslations(translations),
  };
}

export async function getSetting(db: Database) {
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

export async function updateSetting(
  db: Database,
  input: SettingUpdate,
  invalidator: PublicContentInvalidator,
) {
  const {
    id,
    siteName,
    siteSubName,
    siteSignature,
    siteCopyright,
    ...changes
  } = input;
  const persisted = await observeDbOperation(
    "setting.update",
    "transaction",
    () =>
      db.transaction(async (tx) => {
        const [updated] = Object.keys(changes).length
          ? await tx
              .update(schema.setting)
              .set(changes)
              .where(eq(schema.setting.id, id))
              .returning()
          : await tx
              .select()
              .from(schema.setting)
              .where(eq(schema.setting.id, id))
              .limit(1);
        const result = requireWriteResult(updated, "update", "setting");
        const current = await tx
          .select()
          .from(schema.settingTranslation)
          .where(eq(schema.settingTranslation.settingId, id));
        const next = patchSettingTranslationRows(id, current, {
          id,
          siteName,
          siteSubName,
          siteSignature,
          siteCopyright,
        });
        await tx
          .delete(schema.settingTranslation)
          .where(eq(schema.settingTranslation.settingId, id));
        if (next.length)
          await tx.insert(schema.settingTranslation).values(next);
        return toSettingRecord(result, next);
      }),
  );
  const publicSync = await invalidator.invalidate({ refreshLayout: true });
  return { ...persisted, publicSync: publicSync.state };
}
