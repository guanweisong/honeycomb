import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog pwa', () => {
  test('@regression manifest link exists and offline page is accessible', async ({ page }) => {
    await openBlogHome(page);
    const manifests = page.locator('link[rel="manifest"]');
    await expect(manifests.first()).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(manifests).toHaveCount(2);

    await page.goto('/en/offline', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/en\/offline/);
    await expect(page.locator('main')).toBeVisible();
  });
});
