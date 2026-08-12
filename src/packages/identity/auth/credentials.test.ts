import { describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { hashCredentialPassword } from "./credentials";

describe("Better Auth credential passwords", () => {
  it("hashes passwords in a format Better Auth can verify", async () => {
    const passwordHash = await hashCredentialPassword("password123");

    expect(await verifyPassword({ hash: passwordHash, password: "password123" })).toBe(
      true,
    );
    expect(await verifyPassword({ hash: passwordHash, password: "wrong-password" })).toBe(
      false,
    );
  });
});
