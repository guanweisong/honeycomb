import "server-only";
import { transactionWithBeginRetry } from "@/lib/db/transaction-begin-retry";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import {
  toSettingRecord,
  patchSettingTranslationRows,
} from "./setting-translations";
import { SettingPatchSchema } from "../schemas/setting.patch.schema";
import { can, Permission } from "@/lib/auth/permissions";
import { UserStatus } from "@/features/user/types/user.status";
import { ApplicationError } from "@/lib/errors/application-error";
import type { SettingUpdate } from "../types/setting.patch";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";

const busyMessage = "保存暂时繁忙，请核对最新版本后重试";

/** 设置字段、翻译及版本 CAS 原子提交；事务内重新鉴权，提交后的缓存降级不撤销保存。 */
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
      transactionWithBeginRetry(db, busyMessage, async (tx) => {
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
