import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog page detail', () => {
  test('@regression static page detail (about) loads successfully', async ({ page }) => {
    await openBlogHome(page);

    const pageLink = page.locator('a[href*="/en/pages/"]').first();
    await expect(pageLink).toBeVisible();
    await pageLink.click();

    await expect(page).toHaveURL(/\/en\/pages\//);
    await expect(page.locator('main h2').first()).toBeVisible();
    await expect(page.locator('main .prose-editor').first()).toBeVisible();
  });
});
