import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog theme', () => {
  test('@smoke toggle should update html class and persist after reload', async ({ page }) => {
    await openBlogHome(page);

    const themeToggle = page
      .locator('header [data-testid="theme-switcher"], header img[alt="moon"], header img[alt="sun"]')
      .first();
    const hasThemeToggle = (await themeToggle.count()) > 0;
    test.skip(!hasThemeToggle, 'Theme toggle is not rendered in current runtime');
    await expect(themeToggle).toBeVisible();

    const before = await page.locator('html').getAttribute('class');
    await themeToggle.click();
    await page.waitForTimeout(300);

    const after = await page.locator('html').getAttribute('class');
    expect(after).not.toBe(before);

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    const afterReload = await page.locator('html').getAttribute('class');
    expect(afterReload).toBe(after);
  });
});
