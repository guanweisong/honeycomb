import { afterEach, describe, expect, it, vi } from "vitest";

describe("auth production build configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("can initialize Better Auth during a production build without runtime database env", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("AUTH_SECRET", "build-secret");
    vi.stubEnv("AUTH_URL", "https://example.test");
    vi.stubEnv("TURSO_URL", "");
    vi.stubEnv("TURSO_TOKEN", "");

    const module = await import("./auth");

    expect(module.auth.api).toBeDefined();
  });
});
