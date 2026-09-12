import { describe, expect, it } from "vitest";

import { isUserEnabled, UserStatus } from "./user";

describe("isUserEnabled", () => {
  it("keeps the enabled-status rule in one domain predicate", () => {
    expect(isUserEnabled(UserStatus.ENABLE)).toBe(true);
    expect(isUserEnabled(UserStatus.DISABLE)).toBe(false);
    expect(isUserEnabled(UserStatus.DELETED)).toBe(false);
  });
});
