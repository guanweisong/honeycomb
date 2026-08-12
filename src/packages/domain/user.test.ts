import { describe, expect, it } from "vitest";
import {
  type CurrentUser,
  UserLevel,
  userLevelOptions,
  userStatusOptions,
} from "./identity/user";

describe("user domain contract", () => {
  it("provides the minimal current-user contract required by shared UI", () => {
    const user: CurrentUser = {
      id: "user-1",
      name: "Admin",
      level: UserLevel.ADMIN,
    };

    expect(user.level).toBe(UserLevel.ADMIN);
  });

  it("keeps user values and display options stable", () => {
    expect(userLevelOptions.map((item) => item.value)).toEqual([
      "ADMIN",
      "EDITOR",
      "GUEST",
    ]);
    expect(userStatusOptions.map((item) => item.value)).toEqual([
      "DELETED",
      "DISABLE",
      "ENABLE",
    ]);
  });
});
