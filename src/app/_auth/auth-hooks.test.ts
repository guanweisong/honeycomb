import type { Session, User } from "better-auth";
import { assert, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const responses: Array<Array<{ id?: string; status?: string }>> = [];
  return {
    responses,
    getDb: vi.fn(),
    isUserEnabled: vi.fn((status: string) => status === "ENABLE"),
  };
});

vi.mock("@/lib/db/db", () => ({
  getDb: mocks.getDb,
}));
vi.mock(
  "@/features/user/account-security/server/login-history.repository",
  () => ({
    recordLoginHistory: vi.fn(),
  }),
);
vi.mock("@/lib/observability/server", () => ({
  getLogger: () => ({ error: vi.fn() }),
}));
vi.mock("../../lib/auth/authentication-events", () => ({
  getAuthenticationProvider: () => "credentials",
}));
vi.mock("@/features/user/rules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/user/rules")>()),
  isUserEnabled: mocks.isUserEnabled,
}));

import { createAuthDatabaseHooks } from "./auth-hooks";

const session = {
  id: "session-1",
  userId: "user-1",
  token: "test-session-token",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresAt: new Date("2026-01-02T00:00:00.000Z"),
} satisfies Session;

function createUserFixture(overrides: Pick<User, "name" | "email">) {
  return {
    id: "user-1",
    emailVerified: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } satisfies User;
}

function createTestHooks() {
  const hooks = createAuthDatabaseHooks();
  const beforeSessionCreate = hooks.session?.create?.before;
  const beforeUserCreate = hooks.user?.create?.before;
  assert.ok(beforeSessionCreate, "Session creation hook must be configured");
  assert.ok(beforeUserCreate, "User creation hook must be configured");
  return { beforeSessionCreate, beforeUserCreate };
}

function setupDatabase() {
  mocks.isUserEnabled.mockImplementation(
    (status: string) => status === "ENABLE",
  );
  const limit = vi.fn(async () => mocks.responses.shift() ?? []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  mocks.getDb.mockReturnValue({ select });
}

describe("auth database hooks", () => {
  it.each([
    ["ENABLE", undefined],
    ["DISABLE", false],
    ["DELETED", false],
  ] as const)(
    "only creates sessions for enabled users: %s",
    async (status, expected) => {
      setupDatabase();
      mocks.responses = [[{ status }]];
      const hooks = createTestHooks();
      const result = await hooks.beforeSessionCreate(session, null);
      expect(result).toBe(expected);
    },
  );

  it("generates a unique OAuth username", async () => {
    setupDatabase();
    mocks.responses = [[{ id: "existing" }], []];
    const hooks = createTestHooks();

    const result = await hooks.beforeUserCreate(
      createUserFixture({
        name: " New User ",
        email: "new@example.com",
      }),
      null,
    );

    expect(result).toEqual({
      data: expect.objectContaining({ name: "New User_1" }),
    });
  });

  it("rejects session creation for a disabled user", async () => {
    setupDatabase();
    mocks.responses = [[{ status: "DISABLE" }]];
    const hooks = createTestHooks();

    const result = await hooks.beforeSessionCreate(session, null);

    expect(result).toBe(false);
  });

  it("uses the shared session policy as the authorization decision", async () => {
    setupDatabase();
    mocks.responses = [[{ status: "ENABLE" }]];
    mocks.isUserEnabled.mockReturnValue(false);
    const hooks = createTestHooks();

    const result = await hooks.beforeSessionCreate(session, null);

    expect(result).toBe(false);
  });

  it("fails after exhausting username candidates", async () => {
    setupDatabase();
    mocks.responses = Array.from({ length: 20 }, () => [{ id: "existing" }]);
    const hooks = createTestHooks();

    await expect(
      hooks.beforeUserCreate(
        createUserFixture({
          name: "重复用户",
          email: "duplicate@example.com",
        }),
        null,
      ),
    ).rejects.toThrow("无法为 OAuth 用户生成唯一用户名");
  });
});
