import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: mocks.getDb,
}));

import { getAdminUser } from "./admin-auth";

describe("getAdminUser", () => {
  it("returns the enabled user from the current request session", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "user-1" } });
    mocks.getDb.mockReturnValueOnce({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              { id: "user-1", email: null, level: "ADMIN", name: "Admin", status: "ENABLE" },
            ],
          }),
        }),
      }),
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
    mocks.getSession.mockResolvedValueOnce(null);

    await expect(getAdminUser(new Headers())).resolves.toBeNull();
  });

  it("returns null when the user is disabled", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "user-1" } });
    mocks.getDb.mockReturnValueOnce({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              { id: "user-1", level: "ADMIN", name: "Admin", status: "DISABLE" },
            ],
          }),
        }),
      }),
    });

    await expect(getAdminUser(new Headers())).resolves.toBeNull();
  });
});
