import { test as base, expect, type BrowserContext } from "@playwright/test";
import { assertSafeE2ESeedTarget } from "../../../scripts/e2e-seed-policy";

/** Real password sign-in, once per worker. Each test gets a fresh browser context.
 * Only the local seed account is used; no role/session/data responses are mocked.
 */
export const test = base.extend<
  { renderErrors: void },
  { adminStorageState: Awaited<ReturnType<BrowserContext["storageState"]>> }
>({
  adminStorageState: [
    async ({ playwright }, provide, workerInfo) => {
      assertSafeE2ESeedTarget(process.env);
      const baseURL = workerInfo.project.use.baseURL;
      const origin = new URL(baseURL!);
      if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
        throw new Error("Admin render smoke tests require a local test server");
      }
      const request = await playwright.request.newContext({ baseURL });
      try {
        const response = await request.post("/api/auth/sign-in/username", {
          data: {
            username: "page-smoke-admin",
            password: "page-smoke-test-only",
          },
          headers: { "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX" },
        });
        await expect(response).toBeOK();
        expect((await response.json()).user.level).toBe("ADMIN");
        await provide(await request.storageState());
      } finally {
        await request.dispose();
      }
    },
    { scope: "worker" },
  ],
  storageState: async ({ adminStorageState }, provide) =>
    provide(adminStorageState),
  renderErrors: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      // Uncaught browser exceptions are failures. Console warnings (including
      // framework development diagnostics) are not uncaught page errors.
      page.on("pageerror", (error) => errors.push(error.message));
      await provide();
      expect(errors, "uncaught browser exceptions").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
