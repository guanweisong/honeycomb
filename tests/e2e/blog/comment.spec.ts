import { test, expect } from "@playwright/test";
import { decodeTrpcBatchRequest } from "@tests/helpers/trpc-batch";
import { openFirstPostDetail } from "@tests/e2e/blog/helpers";

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

const postId = "000000000000000000000005";

test("@regression public comments redact moderated content on the wire and retain replies", async ({
  request,
  page,
}) => {
  const response = await request.get("/api/trpc/comment.listByRef", {
    params: { input: JSON.stringify({ id: postId, type: "CATEGORY" }) },
  });
  await expect(response).toBeOK();
  const body = await response.text();
  expect(body).toContain('"content":""');
  expect(body).toContain("Visible reply beneath moderated parent");
  for (const secret of [
    "PRIVATE_BANNED_COMMENT_SENTINEL",
    "private-comment@honeycomb.test",
    "192.0.2.10",
    "PRIVATE_AGENT_SENTINEL",
  ]) {
    expect(body).not.toContain(secret);
  }
  const document = await page.goto(`/en/archives/${postId}`);
  expect(await document?.text()).not.toContain(
    "PRIVATE_BANNED_COMMENT_SENTINEL",
  );
  await expect(
    page.getByText("Visible reply beneath moderated parent", { exact: true }),
  ).toBeVisible();
});

test("@regression comment reply and cancel controls work from the keyboard", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        author: "Keyboard visitor",
        email: "keyboard@honeycomb.test",
      }),
    );
  });
  await page.goto(`/en/archives/${postId}`);
  // The saved identity appears after the comment component's mount effect;
  // this waits for hydration without arbitrary sleeps or internal React APIs.
  await expect(page.getByText(/Welcome back.*Keyboard visitor/)).toBeVisible();
  const reply = page
    .getByRole("button", { name: "Reply", exact: true })
    .first();
  await reply.focus();
  await expect(reply).toBeFocused();
  await reply.press("Enter");
  await expect(page.getByText("Reply to:", { exact: true })).toBeVisible();
  const cancel = page.getByRole("button", { name: /Cancel/i });
  await cancel.focus();
  await cancel.press("Space");
  await expect(page.getByText("Reply to:", { exact: true })).toHaveCount(0);
  const quit = page.getByRole("button", { name: /Quit/i });
  await quit.press("Enter");
  await expect(page.getByLabel(/Please enter email/)).toBeVisible();
});
