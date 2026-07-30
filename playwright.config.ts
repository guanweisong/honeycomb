import { defineConfig, devices } from "@playwright/test";

const HOST = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;
const USE_DEV_SERVER = process.env.PLAYWRIGHT_USE_DEV_SERVER === "1";
const REUSE_EXISTING_SERVER =
  process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";
const OUTPUT_DIR =
  process.env.PLAYWRIGHT_OUTPUT_DIR ?? "/private/tmp/honeycomb-e2e-results";
const HTML_REPORT_DIR =
  process.env.PLAYWRIGHT_HTML_REPORT ??
  "/private/tmp/honeycomb-playwright-report";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: OUTPUT_DIR,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: HTML_REPORT_DIR, open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: USE_DEV_SERVER
      ? `bun next dev -p ${PORT} -H ${HOST}`
      : `bun run build && bun next start -p ${PORT} -H ${HOST}`,
    url: `${BASE_URL}/manifest.webmanifest`,
    reuseExistingServer: REUSE_EXISTING_SERVER,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      NEXT_PUBLIC_ASSET_URL:
        process.env.NEXT_PUBLIC_ASSET_URL ?? "https://assets.honeycomb.test",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      TURSO_URL: process.env.TURSO_URL ?? "http://127.0.0.1:1",
      TURSO_TOKEN: process.env.TURSO_TOKEN ?? "playwright-unreachable-database",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-production-secret",
      AUTH_URL: BASE_URL,
      RESEND_API_KEY:
        process.env.RESEND_API_KEY ?? "playwright-unused-resend-key",
      RESEND_FROM_EMAIL:
        process.env.RESEND_FROM_EMAIL ?? "noreply@honeycomb.test",
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "admin@honeycomb.test",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
