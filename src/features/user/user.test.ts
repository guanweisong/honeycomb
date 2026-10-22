// @vitest-environment node

import { describe, expect, it } from "vitest";

import { isUserEnabled } from "@/features/user/rules";
import { UserStatus } from "@/features/user/types/user.status";

describe("isUserEnabled", () => {
  it("keeps the enabled-status rule in one domain predicate", () => {
    expect(isUserEnabled(UserStatus.ENABLE)).toBe(true);
    expect(isUserEnabled(UserStatus.DISABLE)).toBe(false);
    expect(isUserEnabled(UserStatus.DELETED)).toBe(false);
  });
});
