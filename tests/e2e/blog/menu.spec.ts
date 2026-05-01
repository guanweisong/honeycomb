import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog menu', () => {
  test('@regression category navigation and active state should work', async ({ page }) => {
    await openBlogHome(page);

    const categoryMenuLink = page
      .locator('header a[href*="/en/list/category/"]')
      .filter({ hasNotText: /^$/ })
      .first();

    await expect(categoryMenuLink).toBeVisible();
    await categoryMenuLink.click();
    await expect(page).toHaveURL(/\/en\/list\/category\//);

    const activeMenu = page.locator('header a[aria-current="page"]').first();
    await expect(activeMenu).toBeVisible();
    await expect(activeMenu).toHaveAttribute('href', /\/en\/list\/category/);
  });
});
