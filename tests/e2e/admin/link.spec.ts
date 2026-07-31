import { expect, test } from "@playwright/test";

test.describe("admin link", () => {
  test("@regression redirects an unauthenticated visitor before rendering link management", async ({
    page,
  }) => {
    await page.route("https://**", (route) => route.abort());

    await page.goto("/admin/link", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "登录", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("添加链接")).toHaveCount(0);
    await expect(page.getByText("批量删除")).toHaveCount(0);
  });
});
