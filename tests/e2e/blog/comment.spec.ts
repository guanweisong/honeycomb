import { test, expect } from "@playwright/test";
import { decodeTrpcBatchRequest } from "../../helpers/trpc-batch";
import { openFirstPostDetail } from "./helpers";

test.describe("blog comment", () => {
  test("@regression submit should be blocked without captcha and never call create API", async ({
    page,
  }) => {
    // Keep Turnstile unresolved even when CI uses its auto-pass test key.
    await page.route("https://challenges.cloudflare.com/**", (route) =>
      route.abort(),
    );
    await openFirstPostDetail(page);

    let createCalls = 0;
    page.on("request", (req) => {
      if (
        req.method() === "POST" &&
        new URL(req.url()).pathname.startsWith("/api/trpc/")
      ) {
        createCalls += decodeTrpcBatchRequest({
          url: req.url(),
          method: req.method(),
          body: req.postData(),
        }).filter((call) => call.procedure === "comment.create").length;
      }
    });

    await page.locator('input[name="author"]').fill("E2E Visitor");
    await page.locator('input[name="email"]').fill("visitor@example.test");
    await page
      .locator('textarea[name="content"]')
      .fill("e2e should not submit without captcha");
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText("Please complete the captcha first", { exact: true }),
    ).toBeVisible();

    expect(createCalls).toBe(0);
  });
});
