import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveAssetOrigin } from "./e2e/security-headers-config";

async function loadWebServerEnvironment() {
  vi.resetModules();

  const config = (await import("../playwright.config")).default;
  const webServer = Array.isArray(config.webServer)
    ? config.webServer[0]
    : config.webServer;

  return webServer?.env;
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

    const environment = await loadWebServerEnvironment();

    expect(environment?.NEXT_PUBLIC_ASSET_URL).toBe(
      "https://static.integration.example.test",
    );
  });

  it("uses only the configured asset URL origin in security assertions", () => {
    expect(resolveAssetOrigin("https://cdn.example.test/uploads")).toBe(
      "https://cdn.example.test",
    );
  });
});
