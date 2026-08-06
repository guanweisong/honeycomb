import { describe, expect, it } from "vitest";
import { buildCredentialAccountRows, buildUsernameBackfillRows } from "./migration";

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
});
