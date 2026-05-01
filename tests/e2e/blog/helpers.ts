import { expect, Page } from '@playwright/test';

export const BLOG_HOME_PATH = '/en/list/category';
export const FAKE_ID = 'ffffffffffffffffffffffff';

export async function openBlogHome(page: Page) {
  await page.goto(BLOG_HOME_PATH, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/en\/list\/category/);
}

export async function openFirstPostDetail(page: Page) {
  await openBlogHome(page);
  const firstPost = page.locator('a[href*="/en/archives/"]').first();
  await expect(firstPost).toBeVisible();
  await firstPost.click();
  await expect(page).toHaveURL(/\/en\/archives\//);
}

