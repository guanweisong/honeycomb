import { expect, test } from "@playwright/test";

test.describe("admin menu", () => {
  test("@regression redirects an unauthenticated visitor before rendering the menu editor", async ({
    page,
  }) => {
    await page.route("https://**", (route) => route.abort());

    await page.goto("/admin/menu", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "登录", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("可选菜单项")).toHaveCount(0);
    await expect(page.getByText("菜单结构")).toHaveCount(0);
  });
});
