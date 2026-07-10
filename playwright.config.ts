import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const USE_DEV_SERVER = process.env.PLAYWRIGHT_USE_DEV_SERVER === "1";
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
    command: USE_DEV_SERVER ? "bun run dev" : "bun run build && bun run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
