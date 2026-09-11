import { describe, expect, it, vi } from "vitest";
import type { BetterAuthOptions } from "better-auth";
import { getConfiguredProviderIds } from "@/packages/identity/auth/policy";

const captured = vi.hoisted(() => ({
  options: undefined as BetterAuthOptions | undefined,
}));

vi.mock("better-auth", () => ({
  betterAuth: (options: BetterAuthOptions) => {
    captured.options = options;
    return { $Infer: {} };
  },
}));
vi.mock("@better-auth/drizzle-adapter", () => ({
  drizzleAdapter: vi.fn(() => ({})),
}));
vi.mock("@better-auth/passkey", () => ({ passkey: vi.fn(() => ({})) }));
vi.mock("better-auth/plugins", () => ({
  captcha: vi.fn(() => ({})),
  username: vi.fn(() => ({})),
}));
vi.mock("@/env/server", () => ({
  getAuthEnv: () => ({
    AUTH_URL: "http://localhost:3000",
    AUTH_SECRET: "test-secret",
  }),
}));
vi.mock("@/packages/infrastructure/db/db", () => ({ getDb: vi.fn() }));
vi.mock("@/packages/infrastructure/db/schema", () => ({}));
vi.mock("@/packages/identity/auth/passkey-config", () => ({
  getPasskeyConfig: () => ({}),
}));
vi.mock("@/packages/identity/auth/server/auth-hooks", () => ({
  createAuthDatabaseHooks: () => ({}),
}));

describe("auth transport boundary", () => {
  it("keeps the supported social provider order stable", () => {
    expect(
      getConfiguredProviderIds({
        apple: { clientId: "apple-id", clientSecret: "apple-secret" },
        google: { clientId: "google-id", clientSecret: "google-secret" },
        github: { clientId: "github-id", clientSecret: "github-secret" },
      }),
    ).toEqual(["apple", "google", "github"]);
  });

  it("does not expose Better Auth's generic user update endpoint", async () => {
    await import("./auth");

    expect(captured.options?.disabledPaths).toContain("/update-user");
  });
});
