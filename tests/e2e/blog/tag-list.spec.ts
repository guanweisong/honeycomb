import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog tag list', () => {
  test('@regression tag list page loads successfully', async ({ page }) => {
    await openBlogHome(page);

    const firstPost = page.locator('a[href*="/en/archives/"]').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();
    await expect(page).toHaveURL(/\/en\/archives\//);

    const tagLink = page.locator('a[href*="/en/list/tags/"]').first();
    await expect(tagLink).toBeVisible();
    await tagLink.click();
    await expect(page).toHaveURL(/\/en\/list\/tags\/.+/);
    await expect(page.locator('main')).toContainText(/tag|标签/i);
    await expect(page.locator('main')).toBeVisible();
  });
});
