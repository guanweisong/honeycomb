import { expect, it, vi } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createCommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";

it("reads the stable settings singleton and preserves missing-setting behavior", async () => {
  const mock = createMockDb();
  const findFirst = vi.fn().mockResolvedValue(undefined);
  const db = asMockDatabase({
    ...mock,
    query: { ...mock.query, setting: { findFirst } },
  });
  const repository = createCommentNotificationRepository(db);
  await expect(repository.getSetting()).resolves.toBeUndefined();
  expect(findFirst).toHaveBeenCalledOnce();
  const predicate = findFirst.mock.calls[0]?.[0].where;
  expect(new SQLiteSyncDialect().sqlToQuery(predicate)).toMatchObject({
    sql: '"setting"."singleton_key" = ?',
    params: [1],
  });
  expect(mock.select).not.toHaveBeenCalled();
});
