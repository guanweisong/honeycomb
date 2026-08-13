import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/packages/infrastructure/db/db", () => ({ getDb: dbMocks.getDb }));

import {
  buildCredentialAccountRows,
  buildUsernameBackfillRows,
  migrateLegacyCredentialAccounts,
} from "./migration";

describe("Better Auth credential migration", () => {
  it("creates one credential account for users with passwords", () => {
    expect(
      buildCredentialAccountRows(
        [
          { id: "user-1", password: "hash-1" },
          { id: "user-2", password: null },
        ],
        [],
      ),
    ).toEqual([
      expect.objectContaining({
        userId: "user-1",
        accountId: "user-1",
        providerId: "credential",
        password: "hash-1",
      }),
    ]);
  });

  it("does not duplicate an existing credential account", () => {
    expect(
      buildCredentialAccountRows(
        [{ id: "user-1", password: "hash-1" }],
        [{ userId: "user-1", providerId: "credential" }],
      ),
    ).toEqual([]);
  });

  it("backfills Better Auth usernames from existing business names", () => {
    expect(
      buildUsernameBackfillRows([
        { id: "user-1", name: "Alice", username: null },
        { id: "user-2", name: null, username: null },
        { id: "user-3", name: "Existing", username: "existing" },
      ]),
    ).toEqual([{ id: "user-1", username: "Alice", displayUsername: "Alice" }]);
  });

  it("migrates credential accounts and usernames in one pass", async () => {
    const select = vi.fn();
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const updateWhere = vi.fn().mockResolvedValue(undefined);

    select
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([
        { id: "user-1", name: "Alice", username: null, password: "hash" },
      ]) })
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([]) });
    dbMocks.getDb.mockReturnValue({
      select,
      insert: vi.fn(() => ({ values: insertValues })),
      update: vi.fn(() => ({ set: () => ({ where: updateWhere }) })),
    });

    await expect(migrateLegacyCredentialAccounts()).resolves.toEqual({
      migrated: 1,
      usernamesBackfilled: 1,
    });
    expect(insertValues).toHaveBeenCalledOnce();
    expect(updateWhere).toHaveBeenCalledOnce();
  });
});
