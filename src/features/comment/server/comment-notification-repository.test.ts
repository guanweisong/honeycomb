import { expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createCommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";

it("reads the stable settings singleton and preserves missing-setting behavior", async () => {
  const mock = createMockDb();
  mock.from.mockReturnValueOnce(
    Object.assign(Promise.resolve([]), { where: mock.where }),
  );
  mock.limit.mockResolvedValue([]);
  const repository = createCommentNotificationRepository(asMockDatabase(mock));
  await expect(repository.getSetting()).resolves.toBeUndefined();
  expect(mock.where).toHaveBeenCalledOnce();
  const predicate = mock.where.mock.calls[0]?.[0];
  expect(new SQLiteSyncDialect().sqlToQuery(predicate)).toMatchObject({
    sql: '"setting"."singleton_key" = ?',
    params: [1],
  });
  expect(mock.limit).toHaveBeenCalledWith(1);
});
