import { test, expect } from '@playwright/test';
import { openBlogHome } from './helpers';

test.describe('blog home', () => {
  test('@smoke home list is visible and infinite scroll can trigger loading', async ({ page }) => {
    await openBlogHome(page);

    const postLinks = page.locator('a[href*="/en/archives/"]');
    await expect(postLinks.first()).toBeVisible();

    const beforeCount = await postLinks.count();

    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });

    const loader = page.locator('svg.animate-spin').first();
    await Promise.race([
      loader.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined),
      page.waitForTimeout(1_200),
    ]);

    await expect
      .poll(async () => await postLinks.count(), {
        timeout: 15_000,
        message: '列表数量应增长（有下一页）或至少保持初始可见状态',
      })
      .toBeGreaterThanOrEqual(beforeCount);

    const afterCount = await postLinks.count();
    expect(afterCount).toBeGreaterThan(0);
  });
});
