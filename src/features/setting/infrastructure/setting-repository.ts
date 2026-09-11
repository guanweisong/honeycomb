import "server-only";
import { requireWriteResult } from "@/packages/infrastructure/db/value-validation";

import { eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { CommentStatus } from "@/packages/domain/content/comment";
import { PostType } from "@/packages/domain/content/post";
import { UserLevel } from "@/packages/domain/identity/user";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { SettingRepository } from "../application/repository";
export type { SettingRecord, SettingRepository, SettingUpdate, StatisticsType } from "../application/repository";
import {
  assembleSettingTranslations,
  patchSettingTranslationRows,
} from "./setting-translations";

export function createSettingRepository(db: Database): SettingRepository {
  return {
    async get() {
      const list = await observeDbOperation("setting.get", "select", () => db.select().from(schema.setting));
      const setting = list[0];
      if (!setting) return undefined;
      const translations = await observeDbOperation("setting.get", "select", () =>
        db
          .select()
          .from(schema.settingTranslation)
          .where(eq(schema.settingTranslation.settingId, setting.id)),
      );
      return { ...setting, ...assembleSettingTranslations(translations) };
    },
    async update(input) {
      const {
        id,
        siteName,
        siteSubName,
        siteSignature,
        siteCopyright,
        ...changes
      } = input;
      const setting = await observeDbOperation("setting.update", "transaction", () =>
        db.transaction(async (tx) => {
          const [updated] = Object.keys(changes).length
            ? await tx.update(schema.setting).set(changes).where(eq(schema.setting.id, id)).returning()
            : await tx.select().from(schema.setting).where(eq(schema.setting.id, id)).limit(1);
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
          if (next.length) await tx.insert(schema.settingTranslation).values(next);
          return { ...result, ...assembleSettingTranslations(next) };
        }),
      );
      return setting;
    },
    async statistics() {
      const countByValues = async <T extends string>(values: readonly T[], table: typeof schema.post | typeof schema.user | typeof schema.comment, column: Parameters<typeof eq>[0], operation: Parameters<typeof observeDbOperation>[0]) =>
        Promise.all(values.map(async (item) => {
          const [row] = await observeDbOperation(operation, "select", () => db.select({ count: sql<number>`count(*)`.as("count") }).from(table).where(eq(column, item)));
          return { item, count: Number(row?.count) || 0 };
        }));
      const [postType, userType, commentStatus, userList, postCounts] = await Promise.all([
        countByValues(Object.values(PostType), schema.post, schema.post.type, "statistics.posts-by-type"),
        countByValues(Object.values(UserLevel), schema.user, schema.user.level, "statistics.users-by-level"),
        countByValues(Object.values(CommentStatus), schema.comment, schema.comment.status, "statistics.comments-by-status"),
        observeDbOperation("statistics.user-list", "select", () => db.select({ id: schema.user.id, name: schema.user.name }).from(schema.user)),
        observeDbOperation("statistics.posts-by-author", "select", () => db.select({ authorId: schema.post.authorId, count: sql<number>`count(*)`.as("count") }).from(schema.post).groupBy(schema.post.authorId)),
      ]);
      const postCountByAuthor = new Map(postCounts.map((row) => [row.authorId, Number(row.count) || 0]));
      return {
        postType,
        userType,
        commentStatus,
        userPost: userList.map((user) => ({ item: user.name ?? user.id, count: postCountByAuthor.get(user.id) ?? 0 })),
      };
    },
  };
}
