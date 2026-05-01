import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog a11y', () => {
  test('@regression skip link should move focus target to main content', async ({ page }) => {
    await openBlogHome(page);

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator('#main-content')).toBeVisible();
  });
});
