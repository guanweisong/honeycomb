import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveAssetOrigin } from "./e2e/security-headers-config";

async function loadWebServerConfiguration() {
  vi.resetModules();

  const config = (await import("../playwright.config")).default;
  const webServer = Array.isArray(config.webServer)
    ? config.webServer[0]
    : config.webServer;

  return webServer;
}

describe("Playwright web server configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("passes complete configured R2 credentials to the managed web server", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
    vi.stubEnv("R2_ACCESS_KEY_ID", "playwright-access-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "playwright-secret-key");
    vi.stubEnv("R2_BUCKET_NAME", "playwright-bucket");

    const environment = (await loadWebServerConfiguration())?.env;

    expect(environment).toMatchObject({
      R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      R2_ACCESS_KEY_ID: "playwright-access-key",
      R2_SECRET_ACCESS_KEY: "playwright-secret-key",
      R2_BUCKET_NAME: "playwright-bucket",
    });
  });

  it("generates a development worker before starting the development server", async () => {
    vi.stubEnv("PLAYWRIGHT_USE_DEV_SERVER", "1");
    const server = await loadWebServerConfiguration();
    expect(server?.command).toMatch(
      /^bun scripts\/build-serwist\.ts --development && bun next dev /,
    );
    expect(server?.url).toMatch(/\/en\/manifest\.webmanifest$/);
  });

  it("rebuilds the production worker before starting the production server", async () => {
    vi.stubEnv("PLAYWRIGHT_USE_DEV_SERVER", "0");
    const server = await loadWebServerConfiguration();
    expect(server?.command).toMatch(/^bun run build && bun next start /);
    expect(server?.url).toMatch(/\/en\/manifest\.webmanifest$/);
  });

  it("uses only the configured asset URL origin in security assertions", () => {
    expect(resolveAssetOrigin("https://cdn.example.test/uploads")).toBe(
      "https://cdn.example.test",
    );
  });
});
