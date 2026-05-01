import { test, expect } from '@playwright/test';
import { FAKE_ID } from './helpers';

test.describe('blog empty state', () => {
  test('@regression fake tag/author pages should render no data page', async ({ page }) => {
    await page.goto(`/en/list/tags/${FAKE_ID}`, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('a[href*="/en/archives/"]')).toHaveCount(0);

    await page.goto(`/en/list/authors/${FAKE_ID}`, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('a[href*="/en/archives/"]')).toHaveCount(0);
  });
});
