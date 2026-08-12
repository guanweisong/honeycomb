import { describe, expect, it } from "vitest";
import { canCreateSessionForUser, getConfiguredProviderIds } from "./policy";
import { UserStatus } from "@/packages/domain/identity/user";

describe("Better Auth policy", () => {
  it("only allows enabled users to create sessions", () => {
    expect(canCreateSessionForUser(UserStatus.ENABLE)).toBe(true);
    expect(canCreateSessionForUser(UserStatus.DISABLE)).toBe(false);
    expect(canCreateSessionForUser(UserStatus.DELETED)).toBe(false);
  });

  it("returns only configured social providers", () => {
    expect(
      getConfiguredProviderIds({
        apple: { clientId: "a", clientSecret: "a" },
        google: undefined,
        github: { clientId: "g", clientSecret: "g" },
      }),
    ).toEqual(["apple", "github"]);
  });
});
