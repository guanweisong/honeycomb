import { expect, test } from "@playwright/test";
import { installTurnstileWidgetFixture } from "./auth";
import { guest } from "../fixtures/auth.json";

for (const [target, expected] of [
  ["https://evil.test/steal", "/admin/dashboard"],
  ["//evil.test/steal", "/admin/dashboard"],
  [
    "/admin/account/security?tab=sessions",
    "/admin/account/security?tab=sessions",
  ],
] as const) {
  test(`@regression login normalizes callback ${target}`, async ({ page }) => {
    // Only the external captcha and credential transport are fixtures; both
    // server/client normalization and browser navigation run unchanged.
    await installTurnstileWidgetFixture(page);
    await page.route("**/api/auth/sign-in/username", (route) =>
      route.fulfill({
        json: { token: "fixture-token", user: { id: "fixture-user" } },
      }),
    );
    await page.route(`**${expected}`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<main>Callback destination</main>",
      }),
    );
    await page.goto(`/admin/login?targetUrl=${encodeURIComponent(target)}`);
    const login = page.getByRole("button", { name: "登录", exact: true });
    // SSR fields can be visible before hydration and the captcha callback.
    // Wait for the committed token before filling so hydration cannot erase
    // the credentials, and submission cannot race captcha readiness.
    await expect(login).toBeEnabled();
    await page.getByPlaceholder("用户名", { exact: true }).fill(guest.username);
    await page.getByPlaceholder("密码", { exact: true }).fill(guest.password);
    await login.click();
    await expect(page).toHaveURL(
      (url) => url.pathname + url.search === expected,
    );
    await expect(
      page.getByText("Callback destination", { exact: true }),
    ).toBeVisible();
  });
}
