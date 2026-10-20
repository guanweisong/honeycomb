import "server-only";
import { requireWriteResult } from "@/lib/db/value-validation";

import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { CommentStatus } from "@/features/comment/comment-status";
import { PostType } from "@/features/post/post-type";
import { UserLevel } from "@/features/user/user";
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

export async function getStatistics(db: Database) {
  const countByValues = async <T extends string>(
    values: readonly T[],
    table: typeof schema.post | typeof schema.user | typeof schema.comment,
    column: Parameters<typeof eq>[0],
    operation: Parameters<typeof observeDbOperation>[0],
  ) =>
    Promise.all(
      values.map(async (item) => {
        const [row] = await observeDbOperation(operation, "select", () =>
          db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(table)
            .where(eq(column, item)),
        );
        return { item, count: Number(row?.count) || 0 };
      }),
    );
  const [postType, userType, commentStatus, userList, postCounts] =
    await Promise.all([
      countByValues(
        Object.values(PostType),
        schema.post,
        schema.post.type,
        "statistics.posts-by-type",
      ),
      countByValues(
        Object.values(UserLevel),
        schema.user,
        schema.user.level,
        "statistics.users-by-level",
      ),
      countByValues(
        Object.values(CommentStatus),
        schema.comment,
        schema.comment.status,
        "statistics.comments-by-status",
      ),
      observeDbOperation("statistics.user-list", "select", () =>
        db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user),
      ),
      observeDbOperation("statistics.posts-by-author", "select", () =>
        db
          .select({
            authorId: schema.post.authorId,
            count: sql<number>`count(*)`.as("count"),
          })
          .from(schema.post)
          .groupBy(schema.post.authorId),
      ),
    ]);
  const postCountByAuthor = new Map(
    postCounts.map((row) => [row.authorId, Number(row.count) || 0]),
  );
  return {
    postType,
    userType,
    commentStatus,
    userPost: userList.map((user) => ({
      item: user.name ?? user.id,
      count: postCountByAuthor.get(user.id) ?? 0,
    })),
  };
}
