import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, type BetterAuthOptions } from "better-auth";
import { captcha } from "better-auth/plugins";
import { getConfiguredProviderIds } from "@/lib/auth/providers";

const captured = vi.hoisted(() => ({
  options: undefined as BetterAuthOptions | undefined,
  env: {
    AUTH_URL: "http://localhost:3000",
    AUTH_SECRET: "test-secret",
    turnstile: undefined as { secretKey: string } | undefined,
  },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("better-auth/minimal", () => ({
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
  getAuthEnv: () => captured.env,
}));
vi.mock("@/lib/db/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/db/schema", () => ({}));
vi.mock("@/lib/auth/passkey-config", () => ({
  getPasskeyConfig: () => ({}),
}));
vi.mock("@/app/_auth/auth-hooks", () => ({
  createAuthDatabaseHooks: () => ({}),
}));
vi.mock("@/lib/observability/server/registry", () => ({
  getLogger: () => captured.logger,
}));

describe("auth transport boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    captured.options = undefined;
    captured.env.turnstile = undefined;
  });

  afterEach(() => vi.restoreAllMocks());

  it("routes real SDK diagnostics through the safe logger without raw arguments", async () => {
    const rawConsole = vi.spyOn(console, "error").mockImplementation(() => {});
    await import("@/auth");
    const sdkLogger = createLogger(captured.options?.logger);
    const cause = Object.assign(new Error("session=private-session-token"), {
      code: "SQLITE_BUSY",
    });
    const failure = Object.assign(
      new Error("select session where token = ?", { cause }),
      {
        params: ["private-session-token"],
      },
    );

    sdkLogger.error("INTERNAL_SERVER_ERROR", failure);

    expect(captured.logger.error).toHaveBeenCalledExactlyOnceWith(
      "server.error",
      {
        operation: "better-auth",
        diagnosticCode: "SQLITE_BUSY",
      },
    );
    expect(rawConsole).not.toHaveBeenCalled();
    expect(captured.options?.logger?.disabled).not.toBe(true);
  });

  it("preserves the SDK default warning threshold", async () => {
    const rawConsole = vi.spyOn(console, "warn").mockImplementation(() => {});
    await import("@/auth");
    const sdkLogger = createLogger(captured.options?.logger);
    sdkLogger.debug("private debug detail");
    sdkLogger.info("private info detail");
    sdkLogger.warn("private warning detail");

    expect(captured.logger.info).not.toHaveBeenCalled();
    expect(captured.logger.warn).toHaveBeenCalledExactlyOnceWith(
      "server.error",
      {
        operation: "better-auth",
        diagnosticCode: "UNKNOWN",
      },
    );
    expect(rawConsole).not.toHaveBeenCalled();
  });

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
    await import("@/auth");

    expect(captured.options?.disabledPaths).toContain("/update-user");
  });

  it("protects both password sign-in endpoints when Turnstile is configured", async () => {
    captured.env.turnstile = { secretKey: "turnstile-secret" };

    await import("@/auth");

    expect(captcha).toHaveBeenCalledWith({
      provider: "cloudflare-turnstile",
      secretKey: "turnstile-secret",
      endpoints: ["/sign-in/username", "/sign-in/email"],
    });
  });

  it("does not enable CAPTCHA when Turnstile is not configured", async () => {
    await import("@/auth");

    expect(captcha).not.toHaveBeenCalled();
  });
});
