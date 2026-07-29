import { test, expect } from '@playwright/test';
import { BLOG_HOME_PATH, FAKE_ID, openBlogHome } from './helpers';

test.describe('blog pwa', () => {
  test('@regression manifest link exists', async ({ page }) => {
    await openBlogHome(page);
    const manifests = page.locator('link[rel="manifest"]');
    await expect(manifests.first()).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(manifests).toHaveCount(2);
  });

  test('@regression service worker serves the offline fallback for a failed navigation', async ({
    context,
    page,
  }) => {
    await openBlogHome(page);

    const activeWorkerUrl = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.scriptURL ?? '';
    });
    expect(activeWorkerUrl).toContain('/serwist/sw.js');
    await expect
      .poll(() =>
        page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ''),
      )
      .toContain('/serwist/sw.js');

    await page.goto(`${BLOG_HOME_PATH}?pwa-cache-seed=1`, {
      waitUntil: 'networkidle',
    });
    await expect(page.locator('main')).toBeVisible();

    const offlineTarget = `/en/list/tags/${FAKE_ID}?offline-fallback=e2e`;
    try {
      await context.setOffline(true);
      await page.goto(offlineTarget, { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveURL(new RegExp(`/en/list/tags/${FAKE_ID}`));
      const fallback = page
        .getByRole('alert')
        .filter({ hasText: "You're offline" });
      await expect(fallback).toBeVisible();
      await expect(fallback).toContainText("You're offline");
      await expect(fallback).toContainText(
        'Please check your internet connection and try again',
      );
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }

    const manifestResponse = await page.goto('/manifest.webmanifest');
    expect(manifestResponse?.ok()).toBe(true);
  });
});
