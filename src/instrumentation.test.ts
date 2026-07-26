import { afterEach, describe, expect, it, vi } from "vitest";

import { register } from "./instrumentation";

const productionCoreEnv = {
  NEXT_PUBLIC_SITE_URL: "https://honeycomb.example.com",
  TURSO_URL: "libsql://honeycomb.turso.io",
  TURSO_TOKEN: "turso-token",
  AUTH_SECRET: "auth-secret",
  AUTH_URL: "https://honeycomb.example.com",
};

describe("instrumentation register", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid production environment before the server handles requests", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://honeycomb.example.com");
    vi.stubEnv("TURSO_URL", "invalid-turso-url");
    vi.stubEnv("TURSO_TOKEN", "turso-token");
    vi.stubEnv("AUTH_SECRET", "auth-secret");
    vi.stubEnv("AUTH_URL", "https://honeycomb.example.com");

    expect(() => register()).toThrow(/TURSO_URL/);
  });

  it("skips production validation during the build phase", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("TURSO_URL", "invalid-turso-url");

    expect(() => register()).not.toThrow();
  });

  it("allows a valid production environment in either Node or Worker runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "edge");
    for (const [key, value] of Object.entries(productionCoreEnv)) {
      vi.stubEnv(key, value);
    }

    expect(() => register()).not.toThrow();
  });

  it("does not block development startup on production-only validation", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURSO_URL", "invalid-turso-url");

    expect(() => register()).not.toThrow();
  });
});
