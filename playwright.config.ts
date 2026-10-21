import { defineConfig, devices } from "@playwright/test";
import {
  assertSafeE2ESeedTarget,
  E2E_TEST_TOKEN,
} from "./scripts/e2e-seed-policy";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const HOST = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;
const USE_DEV_SERVER = process.env.PLAYWRIGHT_USE_DEV_SERVER === "1";
if (
  !["127.0.0.1", "localhost"].includes(HOST) ||
  !Number.isInteger(PORT) ||
  PORT < 1 ||
  PORT > 65535 ||
  BASE_URL !== `http://${HOST}:${PORT}`
) {
  throw new Error(
    "Playwright requires a matching loopback host, port and HTTP base URL",
  );
}
// Inventory (--list) stays read-only. Invalid targets never point Playwright's
// eager result cleanup at an existing user/repository directory.
let TEST_DIRECTORY = join(tmpdir(), `honeycomb-unconfigured-${randomUUID()}`);
try {
  assertSafeE2ESeedTarget(process.env);
  TEST_DIRECTORY = process.env.HONEYCOMB_TEST_DIR ?? TEST_DIRECTORY;
} catch {
  // The web-server guard reports the invalid target before any app starts.
}
const STARTUP_GUARD =
  "bun --no-env-file scripts/e2e-seed-policy.ts --server && unset AUTH_APPLE_ID AUTH_APPLE_SECRET AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET AUTH_GITHUB_ID AUTH_GITHUB_SECRET UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN SENTRY_AUTH_TOKEN NEXT_PUBLIC_GA_BLOG_ID NEXT_PUBLIC_GA_ADMIN_ID &&";
const DATABASE_URL = /^file:\/[^/]/.test(process.env.TURSO_URL ?? "")
  ? (process.env.TURSO_URL ?? "")
  : "";
const OUTPUT_DIR = join(TEST_DIRECTORY, "playwright-results");
const HTML_REPORT_DIR = join(TEST_DIRECTORY, "playwright-report");

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: OUTPUT_DIR,
  fullyParallel: true,
  updateSnapshots: "none",
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
      ? `${STARTUP_GUARD} bun scripts/build-serwist.ts --development && bun next dev -p ${PORT} -H ${HOST}`
      : `${STARTUP_GUARD} bun run build && bun next start -p ${PORT} -H ${HOST}`,
    url: `${BASE_URL}/en/manifest.webmanifest`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      NEXT_PUBLIC_ASSET_URL:
        process.env.NEXT_PUBLIC_ASSET_URL ?? "https://assets.honeycomb.test",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      R2_ACCESS_KEY_ID: "playwright-unused-r2-access-key",
      R2_SECRET_ACCESS_KEY: "playwright-unused-r2-secret-key",
      R2_BUCKET_NAME: "playwright-unused-r2-bucket",
      TURSO_URL: DATABASE_URL,
      TURSO_TOKEN: E2E_TEST_TOKEN,
      AUTH_SECRET: "uW7fB4qZ9kLm2Rx5Nv8Cd1Yp6Hs3Ta0E",
      AUTH_URL: BASE_URL,
      RESEND_API_KEY: "playwright-unused-resend-key",
      RESEND_FROM_EMAIL: "noreply@honeycomb.test",
      ADMIN_EMAIL: "admin@honeycomb.test",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
