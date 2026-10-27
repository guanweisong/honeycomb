import { describe, expect, it } from "vitest";
import { ApplicationError } from "@/lib/errors/application-error";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createUserRepository } from "@/features/user/server/user-repository";

describe("direct current-user query", () => {
  it("rejects a missing persisted user as unauthorized", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValueOnce([]);
    await expect(
      createUserRepository(asMockDatabase(db)).current("missing-user"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([
    new ApplicationError("NOT_FOUND"),
    new Error("database unavailable"),
  ])("preserves unrelated failures: $message", async (failure) => {
    const db = createMockDb();
    db.limit.mockRejectedValueOnce(failure);
    await expect(
      createUserRepository(asMockDatabase(db)).current("user-1"),
    ).rejects.toBe(failure);
  });
});
