import { describe, expect, it } from "vitest";
import {
  getAuditableSessionEvent,
  getAuthenticationProvider,
  isAuthenticationPath,
} from "./authentication-events";

describe("authentication event classification", () => {
  it("classifies authentication routes without retaining credentials", () => {
    expect(
      getAuthenticationProvider("/sign-in/username", {
        username: "admin",
        password: "secret",
      }),
    ).toBe("password");
    expect(
      getAuthenticationProvider("/sign-in/social", { provider: "github" }),
    ).toBe("github");
    expect(getAuthenticationProvider("/callback/google")).toBe("google");
    expect(
      getAuthenticationProvider("/callback/:id", undefined, { id: "github" }),
    ).toBe("github");
    expect(
      getAuthenticationProvider("/passkey/verify-authentication"),
    ).toBe("passkey");
  });

  it("recognizes username, OAuth callback, and Passkey attempts", () => {
    expect(isAuthenticationPath("/sign-in/username")).toBe(true);
    expect(isAuthenticationPath("/callback/google")).toBe(true);
    expect(isAuthenticationPath("/passkey/verify-authentication")).toBe(true);
  });

  it("classifies only auditable session actions", () => {
    expect(getAuditableSessionEvent("/sign-out")).toBe("SIGN_OUT");
    expect(getAuditableSessionEvent("/revoke-other-sessions")).toBe(
      "REVOKE_OTHER_SESSIONS",
    );
    expect(getAuditableSessionEvent("/list-sessions")).toBeNull();
  });
});
