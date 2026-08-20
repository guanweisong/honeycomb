import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminUser: vi.fn(),
}));

vi.mock("@/features/user/admin-user", () => ({
  getAdminUser: mocks.getAdminUser,
}));
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => ({})),
}));
vi.mock("@/features/user/infrastructure/user-repository", () => ({
  createUserRepository: vi.fn(() => ({})),
}));

import { getAdminUser } from "./admin-auth";

describe("getAdminUser", () => {
  it("keeps database access behind the user feature boundary", () => {
    const source = readFileSync(resolve("src/app/admin/lib/admin-auth.ts"), "utf8");

    expect(source).not.toContain("drizzle-orm");
    expect(source).toContain("features/user/admin-user");
  });

  it("returns the enabled user from the current request session", async () => {
    mocks.getAdminUser.mockResolvedValueOnce({
      id: "user-1", email: null, level: "ADMIN", name: "Admin", status: "ENABLE",
    });

    await expect(getAdminUser(new Headers())).resolves.toEqual({
      id: "user-1",
      email: null,
      level: "ADMIN",
      name: "Admin",
      status: "ENABLE",
    });
  });

  it("returns null when the request has no session", async () => {
    mocks.getAdminUser.mockResolvedValueOnce(null);

    await expect(getAdminUser(new Headers())).resolves.toBeNull();
  });

});
