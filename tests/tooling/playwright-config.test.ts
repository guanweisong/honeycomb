import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeE2ETestTarget } from "../../scripts/e2e-seed-policy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAssetOrigin } from "../e2e/security-headers-config";

async function loadWebServerConfiguration() {
  vi.resetModules();

  const config = (await import("../../playwright.config")).default;
  const webServer = Array.isArray(config.webServer)
    ? config.webServer[0]
    : config.webServer;

  return webServer;
}

describe("Playwright web server configuration", () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-playwright-config-"));
    vi.stubEnv("E2E_SEED", "1");
    vi.stubEnv("HONEYCOMB_TEST_DIR", directory);
    vi.stubEnv("TURSO_URL", `file:${directory}/test.db`);
    vi.stubEnv("TURSO_TOKEN", "e2e-local-only");
    initializeE2ETestTarget(process.env);
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("does not write missing snapshots during verification", async () => {
    vi.resetModules();
    const config = (await import("../../playwright.config")).default;
    expect(config.updateSnapshots).toBe("none");
  });

  it.each([
    { PLAYWRIGHT_HOST: "evil.example" },
    { PLAYWRIGHT_BASE_URL: "https://evil.example" },
    { PLAYWRIGHT_BASE_URL: "http://127.0.0.1:9999" },
    { PLAYWRIGHT_PORT: "3100; echo unsafe" },
  ])("rejects remote or mismatched HTTP targets %j", async (environment) => {
    for (const [key, value] of Object.entries(environment))
      vi.stubEnv(key, value);
    await expect(loadWebServerConfiguration()).rejects.toThrow();
  });
  it("uses a unique non-repository result path without a valid target", async () => {
    vi.stubEnv("HONEYCOMB_TEST_DIR", process.cwd());
    vi.resetModules();
    const first = (await import("../../playwright.config")).default;
    vi.resetModules();
    const second = (await import("../../playwright.config")).default;
    expect(first.outputDir).not.toContain(process.cwd());
    expect(first.outputDir).not.toBe(second.outputDir);
  });
  it("does not pass remote database targets or credentials to server startup", async () => {
    vi.stubEnv("TURSO_URL", "libsql://production.example.com");
    const server = await loadWebServerConfiguration();
    expect(server?.env?.TURSO_URL).toBe("");
    expect(server?.env?.TURSO_TOKEN).toBe("e2e-local-only");
    expect(server?.command).toMatch(
      /^bun --no-env-file scripts\/e2e-seed-policy\.ts --server && unset /,
    );
  });
  it("unsets optional integrations rather than enabling fake OAuth or invalid empty schemas", async () => {
    const server = await loadWebServerConfiguration();
    const command = server?.command ?? "";
    const unset = command
      .split(" && ")
      .find((part) => part.startsWith("unset "))
      ?.split(" ")
      .slice(1);
    expect(unset).toEqual(
      expect.arrayContaining([
        "AUTH_APPLE_ID",
        "AUTH_APPLE_SECRET",
        "AUTH_GOOGLE_ID",
        "AUTH_GOOGLE_SECRET",
        "AUTH_GITHUB_ID",
        "AUTH_GITHUB_SECRET",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "SENTRY_DSN",
        "NEXT_PUBLIC_SENTRY_DSN",
        "SENTRY_AUTH_TOKEN",
        "NEXT_PUBLIC_GA_BLOG_ID",
        "NEXT_PUBLIC_GA_ADMIN_ID",
      ]),
    );
    expect(command.indexOf("--no-env-file")).toBeLessThan(
      command.indexOf("unset "),
    );
  });
  it("never reuses an unknown server", async () => {
    vi.stubEnv("PLAYWRIGHT_REUSE_EXISTING_SERVER", "1");
    expect((await loadWebServerConfiguration())?.reuseExistingServer).toBe(
      false,
    );
  });
  it("uses the same isolated target and sentinel in the application", async () => {
    const server = await loadWebServerConfiguration();
    expect(server?.env).toMatchObject({
      TURSO_URL: `file:${directory}/test.db`,
      TURSO_TOKEN: "e2e-local-only",
    });
    expect(server?.reuseExistingServer).toBe(false);
  });
  it("passes the configured asset URL to the managed web server", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ASSET_URL",
      "https://static.integration.example.test",
    );

    const environment = (await loadWebServerConfiguration())?.env;

    expect(environment?.NEXT_PUBLIC_ASSET_URL).toBe(
      "https://static.integration.example.test",
    );
  }, 15_000);

  it("replaces inherited service credentials with fixed test values", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
    vi.stubEnv("R2_ACCESS_KEY_ID", "playwright-access-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "playwright-secret-key");
    vi.stubEnv("R2_BUCKET_NAME", "playwright-bucket");

    vi.stubEnv("AUTH_SECRET", "inherited-secret");
    vi.stubEnv("RESEND_API_KEY", "inherited-resend");
    const environment = (await loadWebServerConfiguration())?.env;

    expect(environment).toMatchObject({
      R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      R2_ACCESS_KEY_ID: "playwright-unused-r2-access-key",
      R2_SECRET_ACCESS_KEY: "playwright-unused-r2-secret-key",
      R2_BUCKET_NAME: "playwright-unused-r2-bucket",
      AUTH_SECRET: "uW7fB4qZ9kLm2Rx5Nv8Cd1Yp6Hs3Ta0E",
      RESEND_API_KEY: "playwright-unused-resend-key",
    });
  });

  it("generates a development worker before starting the development server", async () => {
    vi.stubEnv("PLAYWRIGHT_USE_DEV_SERVER", "1");
    const server = await loadWebServerConfiguration();
    expect(server?.command).toMatch(
      /&& bun scripts\/build-serwist\.ts --development && bun next dev /,
    );
    expect(server?.url).toMatch(/\/en\/manifest\.webmanifest$/);
  });

  it("rebuilds the production worker before starting the production server", async () => {
    vi.stubEnv("PLAYWRIGHT_USE_DEV_SERVER", "0");
    const server = await loadWebServerConfiguration();
    expect(server?.command).toMatch(/&& bun run build && bun next start /);
    expect(server?.url).toMatch(/\/en\/manifest\.webmanifest$/);
  });

  it("uses only the configured asset URL origin in security assertions", () => {
    expect(resolveAssetOrigin("https://cdn.example.test/uploads")).toBe(
      "https://cdn.example.test",
    );
  });
});
