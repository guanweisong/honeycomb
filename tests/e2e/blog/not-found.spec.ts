import { expect, test } from "@playwright/test";
import { BLOG_HOME_PATH, FAKE_ID } from "./helpers";

const missingRoutes = [
  { path: "/en/route-that-does-not-exist", unmatched: true },
  { path: "/zh/route-that-does-not-exist", unmatched: true },
  { path: `/en/archives/${FAKE_ID}`, unmatched: false },
  { path: `/zh/pages/${FAKE_ID}`, unmatched: false },
  { path: "/en/pages/short", unmatched: false },
  { path: "/zh/archives/short", unmatched: false },
];

for (const { path, unmatched } of missingRoutes) {
  test(`@regression real Next not-found boundary: ${path}`, async ({
    page,
  }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    // Unmatched URLs use the routing-level 404. Detail routes may have already
    // streamed their Suspense shell, in which case Next preserves HTTP 200.
    if (unmatched) expect(response!.status()).toBe(404);
    else expect([200, 404]).toContain(response!.status());
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached();
    // The shared fallback is currently Chinese in both locales. Do not invent
    // a localized English copy or merely render NotFound outside Next's router.
    const fallback = page.getByRole("alert");
    await expect(
      fallback.getByRole("heading", { name: "页面未找到", exact: true }),
    ).toBeVisible();
    await expect(fallback).toContainText("404：请求的页面不存在或已被移除。");
    const home = fallback.getByRole("link", { name: "返回首页", exact: true });
    await expect(home).toHaveAttribute("href", BLOG_HOME_PATH);
    await home.click();
    await expect(page).toHaveURL(new RegExp(`${BLOG_HOME_PATH}$`));
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.locator('main a[href^="/en/archives/"]').first(),
    ).toBeVisible();
  });
}
