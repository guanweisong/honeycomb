import { test, expect } from "@playwright/test";
import { openBlogHome } from "@tests/e2e/blog/helpers";

test.describe("blog theme", () => {
  for (const initialTheme of ["light", "dark"] as const) {
    test(`@smoke toggle from ${initialTheme} persists after reload`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: initialTheme });
      await openBlogHome(page);

      const themeToggle = page
        .locator('[data-testid="theme-switcher"]')
        .first();
      await expect(themeToggle).toBeVisible();
      const html = page.locator("html");
      await expect(html).toHaveClass(
        new RegExp(`(?:^|\\s)${initialTheme}(?:\\s|$)`),
      );
      const chosenTheme = initialTheme === "dark" ? "light" : "dark";
      const chosenClass = new RegExp(`(?:^|\\s)${chosenTheme}(?:\\s|$)`);
      await themeToggle.click();
      await expect(html).toHaveClass(chosenClass);
      await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      await expect(html).toHaveClass(chosenClass);
    });
  }
});
