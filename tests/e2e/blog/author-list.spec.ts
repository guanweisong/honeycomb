import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog author list', () => {
  test('@regression author post list page loads successfully', async ({ page }) => {
    await openBlogHome(page);

    const firstPost = page.locator('a[href*="/en/archives/"]').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();

    const authorLink = page.locator('a[href*="/en/list/authors/"]').first();
    await expect(authorLink).toBeVisible();
    await authorLink.click();

    await expect(page).toHaveURL(/\/en\/list\/authors\//);
    await expect(page.locator('main')).toContainText(/author|作者/i);

    const postLinks = page.locator('a[href*="/en/archives/"]');
    await expect(postLinks.first()).toBeVisible();
  });
});
