import { test, expect } from '@playwright/test';
import { openFirstPostDetail } from './helpers';

test.describe('blog comment', () => {
  test('@regression submit should be blocked without captcha and never call create API', async ({ page }) => {
    await openFirstPostDetail(page);

    let createCalls = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/trpc/comment.create')) {
        createCalls += 1;
      }
    });

    await page.locator('textarea[name="content"]').fill('e2e should not submit without captcha');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(800);

    const captchaInput = page.locator('input[name="captcha"]');
    if (await captchaInput.count()) {
      await expect(captchaInput.first()).toBeVisible();
    }

    expect(createCalls).toBe(0);
  });
});
