import { test, expect } from "@playwright/test";
import { decodeTrpcBatchRequest } from "@tests/helpers/trpc-batch";
import { openBlogHome } from "./helpers";

test.describe("blog home", () => {
  test("@smoke infinite scroll fetches page two and appends distinct posts", async ({
    page,
  }) => {
    // Keep the seeded first page taller than the viewport so page two is
    // requested by scrolling, not automatically during initial hydration.
    await page.setViewportSize({ width: 1280, height: 500 });
    await openBlogHome(page);

    const postLinks = page.locator('main a[href^="/en/archives/"]:visible');
    const distinctPostHrefs = () =>
      postLinks.evaluateAll((links) => [
        ...new Set(links.map((link) => link.getAttribute("href"))),
      ]);
    await expect(postLinks.first()).toBeVisible();
    // A card has title, excerpt and sometimes cover links. Count post identities,
    // not anchors, so duplicate cards/links cannot satisfy pagination coverage.
    await expect.poll(distinctPostHrefs).toHaveLength(10);
    const firstPageHrefs = await distinctPostHrefs();
    const secondPageHrefs = [
      "/en/archives/100000000000000000000008",
      "/en/archives/100000000000000000000009",
    ];
    for (const href of secondPageHrefs) {
      expect(firstPageHrefs).not.toContain(href);
    }
    await expect
      .poll(() =>
        page.evaluate(() => document.body.scrollHeight - window.innerHeight),
      )
      .toBeGreaterThan(300);

    const nextPageRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname.startsWith("/api/trpc/") &&
        decodeTrpcBatchRequest({
          url: request.url(),
          method: request.method(),
          body: request.postData(),
        }).some(({ procedure }) => procedure === "post.index"),
      { timeout: 15_000 },
    );
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
    });
    const request = await nextPageRequest;
    expect(
      decodeTrpcBatchRequest({
        url: request.url(),
        method: request.method(),
        body: request.postData(),
      }),
    ).toContainEqual({
      procedure: "post.index",
      input: {
        page: 2,
        limit: 10,
        sortField: "createdAt",
        status: ["PUBLISHED"],
      },
    });
    const response = await request.response();
    expect(response?.ok()).toBe(true);

    await expect
      .poll(distinctPostHrefs, {
        timeout: 15_000,
        message: "Page two must append new visible post identities",
      })
      .toHaveLength(12);
    const allPostHrefs = await distinctPostHrefs();
    expect(allPostHrefs).toEqual([...firstPageHrefs, ...secondPageHrefs]);
    expect(allPostHrefs.length).toBeGreaterThan(firstPageHrefs.length);
    for (const href of secondPageHrefs) {
      await expect(
        page.locator(`main a[href="${href}"]`).first(),
      ).toBeVisible();
    }
  });
});
