import { test, expect } from "@playwright/test";

test.describe("blog empty state", () => {
  test("@regression an existing tag with no posts remains indexable", async ({
    page,
  }) => {
    const path = "/en/list/tags/000000000000000000000018";
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("main").getByText("Articles under the tag Empty tag"),
    ).toBeVisible();
    await expect(page.locator('a[href*="/en/archives/"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${path}$`),
    );
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]'),
    ).toHaveCount(0);
  });
});
