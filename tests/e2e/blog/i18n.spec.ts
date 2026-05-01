import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog i18n', () => {
  test('@smoke language switch should keep route and change locale', async ({ page }) => {
    await openBlogHome(page);

    const switchToZh = page.getByRole('link', { name: /switch to 中文/i });
    await expect(switchToZh).toBeVisible();
    await switchToZh.click();
    await expect(page).toHaveURL(/\/zh\/list\/category/);

    const switchToEn = page.getByRole('link', { name: /switch to english/i });
    await expect(switchToEn).toBeVisible();
    await switchToEn.click();
    await expect(page).toHaveURL(/\/en\/list\/category/);
  });
});
