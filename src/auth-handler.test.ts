import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env/server", () => ({
  getAuthEnv: () => ({
    AUTH_URL: "http://localhost:3000",
    AUTH_SECRET: "test-secret-with-sufficient-length",
  }),
}));
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => {
    throw new Error("disabled route must not access the database");
  }),
}));
vi.mock("@/packages/infrastructure/db/schema", () => ({}));
vi.mock("@/packages/identity/auth/server/auth-hooks", () => ({
  createAuthDatabaseHooks: () => ({}),
}));

describe("auth handler security boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("TURSO_URL", "");
    vi.stubEnv("TURSO_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 for Better Auth's disabled generic user update route", async () => {
    const { auth } = await import("./auth");
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/update-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bypass attempt" }),
      }),
    );

    expect(response.status).toBe(404);
  });
});
