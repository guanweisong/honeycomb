import { afterEach, describe, expect, it, vi } from "vitest";

const { nextAuthMock } = vi.hoisted(() => ({
  nextAuthMock: vi.fn((options: unknown) => {
    void options;
    return {
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

vi.mock("next-auth", () => ({
  default: nextAuthMock,
}));

const coreVariables = [
  "AUTH_SECRET",
  "AUTH_URL",
  "TURSO_URL",
  "TURSO_TOKEN",
  "NEXT_PUBLIC_SITE_URL",
] as const;

describe("auth production build configuration", () => {
  const originalEnvironment = Object.fromEntries(
    coreVariables.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const key of coreVariables) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.resetModules();
    nextAuthMock.mockClear();
  });

  it("can initialize the auth route during a production build without core env", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    for (const key of coreVariables) delete process.env[key];

    await expect(import("./auth")).resolves.toBeDefined();

    expect(nextAuthMock).toHaveBeenCalledOnce();
    expect(nextAuthMock.mock.calls[0]?.[0]).toMatchObject({
      secret: undefined,
    });
  });

  it("defers incomplete OAuth provider validation until production startup", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("AUTH_GOOGLE_ID", "configured-without-secret");
    delete process.env.AUTH_GOOGLE_SECRET;

    await expect(import("./auth")).resolves.toBeDefined();
  });
});
