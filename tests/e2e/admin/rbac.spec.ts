import { expect, test } from "@playwright/test";

test.describe("admin capability boundary", () => {
  test("@regression hides the admin shell from an unauthenticated visitor", async ({
    page,
  }) => {
    await page.route("https://**", (route) => route.abort());

    await page.goto("/admin/user", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "登录", exact: true }),
    ).toBeVisible();
    await expect(page.locator('a[href="/admin/user"]')).toHaveCount(0);
  });

  test("@regression rejects a direct call to a protected admin procedure", async ({
    request,
  }) => {
    const response = await request.get("/api/trpc/user.index", {
      params: {
        input: JSON.stringify({ json: {} }),
      },
    });
    const body = await response.text();

    expect(response.status()).toBe(401);
    expect(body).toContain('"code":"UNAUTHORIZED"');
    expect(body).not.toContain('"email"');
  });
});
