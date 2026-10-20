import "server-only";

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import {
  assembleSettingTranslations,
  patchSettingTranslationRows,
} from "./server/setting-translations";
import { SettingPatchSchema } from "./schema";
import { can, Permission } from "@/lib/auth/permissions";
import { UserStatus } from "@/features/user/user";
import { ApplicationError } from "@/lib/errors/application-error";
import type { SettingUpdate } from "./types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";

type SettingTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
// Retry BEGIN contention only; never replay a callback that may have committed.
async function settingTransaction<T>(
  db: Database,
  operation: (tx: SettingTransaction) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    let entered = false;
    try {
      return await db.transaction((tx) => {
        entered = true;
        return operation(tx);
      });
    } catch (error) {
      if (
        entered ||
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "SQLITE_BUSY"
      )
        throw error;
      if (attempt >= 3)
        throw new ApplicationError(
          "CONFLICT",
          "保存暂时繁忙，请核对最新版本后重试",
        );
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
    }
  }
}

function toSettingRecord(
  setting: typeof schema.setting.$inferSelect,
  translations: readonly (typeof schema.settingTranslation.$inferSelect)[],
) {
  return {
    id: setting.id,
    version: setting.version,
    siteRecordNo: setting.siteRecordNo,
    siteRecordUrl: setting.siteRecordUrl,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
    ...assembleSettingTranslations(translations),
  };
}

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

export async function updateSetting(
  db: Database,
  submitted: SettingUpdate,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = SettingPatchSchema.safeParse(submitted);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "设置保存输入不合法");
  const input = parsed.data;
  const {
    id,
    expectedVersion,
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
      settingTransaction(db, async (tx) => {
        const [actor] = await tx
          .select({ level: schema.user.level, status: schema.user.status })
          .from(schema.user)
          .where(eq(schema.user.id, actorId))
          .limit(1);
        if (
          !actor ||
          actor.status !== UserStatus.ENABLE ||
          !can(actor.level, Permission.settingUpdate)
        )
          throw new ApplicationError("FORBIDDEN", "当前账户无权保存设置");
        const [updated] = await tx
          .update(schema.setting)
          .set({
            ...changes,
            version: sql`${schema.setting.version} + 1`,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(schema.setting.id, id),
              eq(schema.setting.version, expectedVersion),
            ),
          )
          .returning();
        if (!updated) {
          const [current] = await tx
            .select({ id: schema.setting.id })
            .from(schema.setting)
            .where(eq(schema.setting.id, id))
            .limit(1);
          if (!current) throw new ApplicationError("NOT_FOUND", "设置不存在");
          throw new ApplicationError(
            "CONFLICT",
            "设置已有更新，请核对最新版本",
          );
        }
        const result = updated;
        const current = await tx
          .select()
          .from(schema.settingTranslation)
          .where(eq(schema.settingTranslation.settingId, id));
        const next = patchSettingTranslationRows(id, current, {
          id,
          expectedVersion,
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
  const publicSync = await invalidator
    .invalidate({ refreshLayout: true })
    .catch(() => ({ state: "degraded" as const }));
  return { ...persisted, publicSync: publicSync.state };
}
