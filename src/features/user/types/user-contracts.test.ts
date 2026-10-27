// @vitest-environment node

import { describe, expect, it } from "vitest";
import { type CurrentUser } from "@/features/user/types/user.current";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";

describe("user domain contract", () => {
  it("provides the minimal current-user contract required by shared UI", () => {
    const user: CurrentUser = {
      id: "user-1",
      name: "Admin",
      level: UserLevel.ADMIN,
    };

    expect(user.level).toBe(UserLevel.ADMIN);
  });

  it("keeps user level and status values stable", () => {
    expect(Object.values(UserLevel)).toEqual(["ADMIN", "EDITOR", "GUEST"]);
    expect(Object.values(UserStatus)).toEqual(["DELETED", "ENABLE", "DISABLE"]);
  });
});
