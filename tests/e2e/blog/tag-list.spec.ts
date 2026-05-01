import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog tag list', () => {
  test('@regression tag list page loads successfully', async ({ page }) => {
    await openBlogHome(page);

    const postLinks = page.locator('a[href*="/en/archives/"]');
    const totalPosts = await postLinks.count();
    expect(totalPosts).toBeGreaterThan(0);

    let navigated = false;
    const maxTry = Math.min(totalPosts, 10);

    for (let i = 0; i < maxTry; i++) {
      await openBlogHome(page);
      await postLinks.nth(i).click();
      await expect(page).toHaveURL(/\/en\/archives\//);

      const tagLink = page.locator('a[href*="/en/list/tags/"]').first();
      if (await tagLink.count()) {
        await tagLink.click();
        navigated = true;
        break;
      }
    }

    test.skip(!navigated, 'No tag link is available in sampled posts for current dataset');
    await expect(page).toHaveURL(/\/en\/list\/tags\/.+/);
    await expect(page.locator('main')).toContainText(/tag|标签/i);
    await expect(page.locator('main')).toBeVisible();
  });
});
