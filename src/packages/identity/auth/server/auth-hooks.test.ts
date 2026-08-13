import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  responses: [] as Array<Array<{ id?: string; status?: string }>>,
  getDb: vi.fn(),
}));

vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: mocks.getDb,
}));
vi.mock("@/packages/identity/account-security/server/login-history.repository", () => ({
  recordLoginHistory: vi.fn(),
}));
vi.mock("@/packages/infrastructure/observability/server", () => ({
  getLogger: () => ({ error: vi.fn() }),
}));
vi.mock("../authentication-events", () => ({
  getAuthenticationProvider: () => "credentials",
}));

import { createAuthDatabaseHooks } from "./auth-hooks";

function setupDatabase() {
  const limit = vi.fn(async () => mocks.responses.shift() ?? []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  mocks.getDb.mockReturnValue({ select });
}

describe("auth database hooks", () => {
  it("generates a unique OAuth username", async () => {
    setupDatabase();
    mocks.responses = [[{ id: "existing" }], []];
    const hooks = createAuthDatabaseHooks();

    const result = await hooks.user!.create!.before!({
      id: "user-1",
      name: " New User ",
      email: "new@example.com",
    } as never, {} as never);

    expect(result).toEqual({
      data: expect.objectContaining({ name: "New User_1" }),
    });
  });

  it("rejects session creation for a disabled user", async () => {
    setupDatabase();
    mocks.responses = [[{ status: "DISABLE" }]];
    const hooks = createAuthDatabaseHooks();

    const result = await hooks.session!.create!.before!({
      userId: "user-1",
    } as never, {} as never);

    expect(result).toBe(false);
  });

  it("fails after exhausting username candidates", async () => {
    setupDatabase();
    mocks.responses = Array.from({ length: 20 }, () => [{ id: "existing" }]);
    const hooks = createAuthDatabaseHooks();

    await expect(
      hooks.user!.create!.before!({
        id: "user-1",
        name: "重复用户",
        email: "duplicate@example.com",
      } as never, {} as never),
    ).rejects.toThrow("无法为 OAuth 用户生成唯一用户名");
  });
});
