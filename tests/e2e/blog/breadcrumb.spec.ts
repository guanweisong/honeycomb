import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog breadcrumb', () => {
  test('@regression hidden on home list and visible on category detail list', async ({ page }) => {
    await openBlogHome(page);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);

    const categoryMenuLink = page.locator('header a[href*="/en/list/category/"]').first();
    await expect(categoryMenuLink).toBeVisible();
    await categoryMenuLink.click();
    await expect(page).toHaveURL(/\/en\/list\/category\//);

    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.locator('a[href*="/en/list/category"]')).toHaveCount(1);
  });
});
