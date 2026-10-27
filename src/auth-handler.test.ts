import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env/server", () => ({
  getAuthEnv: () => ({
    AUTH_URL: "http://localhost:3000",
    AUTH_SECRET: "test-secret-with-sufficient-length",
    turnstile: { secretKey: "test-turnstile-secret" },
  }),
}));
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => {
    throw new Error("disabled route must not access the database");
  }),
}));
vi.mock("@/lib/db/schema", () => ({}));
vi.mock("@/app/_auth/auth-hooks", () => ({
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
    const { auth } = await import("@/auth");
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/update-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bypass attempt" }),
      }),
    );

    expect(response.status).toBe(404);
  });

  it.each([
    ["email", { email: "user@example.test", password: "password" }],
    ["username", { username: "user", password: "password" }],
  ])(
    "rejects %s password sign-in without CAPTCHA at the real handler",
    async (path, body) => {
      const { auth } = await import("@/auth");
      const response = await auth.handler(
        new Request(`http://localhost:3000/api/auth/sign-in/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "MISSING_RESPONSE" });
    },
  );
});
