import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog post detail', () => {
  test('@smoke post detail page loads successfully', async ({ page }) => {
    await openBlogHome(page);

    const firstPost = page.locator('a[href*="/en/archives/"]').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();

    await expect(page).toHaveURL(/\/en\/archives\//);
    await expect(page.locator('main h2').first()).toBeVisible();
    await expect(page.locator('main .prose-editor').first()).toBeVisible();
  });
});
