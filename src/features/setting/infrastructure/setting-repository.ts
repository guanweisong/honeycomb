import "server-only";

import { eq, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { CommentStatus } from "@/packages/domain/content/comment";
import { PostType } from "@/packages/domain/content/post";
import { UserLevel } from "@/packages/domain/identity/user";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { SettingRecord, SettingRepository } from "../repository";
export type { SettingRecord, SettingRepository, SettingUpdate, StatisticsType } from "../repository";

export function createSettingRepository(db: Database): SettingRepository {
  return {
    async get() {
      const list = await observeDbOperation("setting.get", "select", () => db.select().from(schema.setting));
      return list[0]! as SettingRecord;
    },
    async update(input) {
      const { id, ...changes } = input;
      const [setting] = await observeDbOperation("setting.update", "update", () => db.update(schema.setting).set(changes as Partial<typeof schema.setting.$inferInsert>).where(eq(schema.setting.id, id)).returning());
      return setting as SettingRecord | undefined;
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
        userPost: userList.map((user) => ({ item: user.name!, count: postCountByAuthor.get(user.id) ?? 0 })),
      };
    },
  };
}
