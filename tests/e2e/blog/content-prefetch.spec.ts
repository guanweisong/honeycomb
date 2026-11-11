import { expect, test, type Page } from "@playwright/test";
import { openBlogHome } from "@tests/e2e/blog/helpers";

function captureRscPayloads(page: Page) {
  const payloads = new Map<string, string[]>();

  page.on("response", async (response) => {
    const headers = response.request().headers();
    // Next's Full prefetch has no Next-Router-Prefetch header. Capture every
    // RSC response so the assertion covers both Full and partial prefetches.
    if (headers.rsc !== "1") return;

    const path = new URL(response.url()).pathname;
    const body = await response.text().catch(() => "");
    payloads.set(path, [...(payloads.get(path) ?? []), body]);
  });

  return payloads;
}

test.describe("blog detail body prefetch", () => {
  test("prefetches a category list body from the menu", async ({ page }) => {
    const payloads = captureRscPayloads(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openBlogHome(page);

    const href = "/en/list/category/engineering";
    const postTitle = "Reliable browser gates";
    const link = page.locator(`header a[href="${href}"]`).first();
    await expect(link).toBeVisible();
    await expect
      .poll(() => payloads.get(href)?.some((body) => body.includes(postTitle)))
      .toBe(true);

    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator("main")).toContainText(postTitle);
  });

  test("prefetches the public article body from the list", async ({ page }) => {
    const payloads = captureRscPayloads(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openBlogHome(page);

    const href = "/en/archives/000000000000000000000005";
    const bodyText = "Deterministic browser test content.";
    const link = page.locator(`main a[href="${href}"]`).first();
    await expect(link).toBeVisible();
    await expect
      .poll(() => payloads.get(href)?.some((body) => body.includes(bodyText)))
      .toBe(true);

    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator("main .prose-editor").first()).toContainText(
      bodyText,
    );
  });

  test("prefetches the public page body from the menu", async ({ page }) => {
    const payloads = captureRscPayloads(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openBlogHome(page);

    const href = "/en/pages/000000000000000000000006";
    const bodyText = "About the E2E site.";
    const link = page.locator(`header a[href="${href}"]`).first();
    await expect(link).toBeVisible();
    await expect
      .poll(() => payloads.get(href)?.some((body) => body.includes(bodyText)))
      .toBe(true);

    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator("main .prose-editor").first()).toContainText(
      bodyText,
    );
  });
});
