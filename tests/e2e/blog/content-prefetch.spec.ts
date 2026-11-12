import { expect, test, type Page } from "@playwright/test";
import { openBlogHome } from "@tests/e2e/blog/helpers";

type RscPayload = {
  path: string;
  headers: Record<string, string>;
  body: string;
  pendingChunks: string[];
  streamingStarted: boolean;
  status?: number;
  completed: boolean;
  error?: string;
};

async function captureRscPayloads(page: Page) {
  const payloads = new Map<string, RscPayload[]>();
  const requests = new Map<string, RscPayload>();
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");

  session.on("Network.requestWillBeSent", ({ requestId, request }) => {
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([name, value]) => [
        name.toLowerCase(),
        String(value),
      ]),
    );
    if (headers.rsc !== "1") return;

    const path = new URL(request.url).pathname;
    const payload: RscPayload = {
      path,
      headers,
      body: "",
      pendingChunks: [],
      streamingStarted: false,
      completed: false,
    };
    requests.set(requestId, payload);
    payloads.set(path, [...(payloads.get(path) ?? []), payload]);
  });

  session.on("Network.responseReceived", ({ requestId, response }) => {
    const payload = requests.get(requestId);
    if (!payload) return;
    payload.status = response.status;

    void session
      .send("Network.streamResourceContent", { requestId })
      .then(({ bufferedData }) => {
        payload.body += Buffer.from(bufferedData, "base64").toString("utf8");
        payload.streamingStarted = true;
        payload.body += payload.pendingChunks.join("");
        payload.pendingChunks = [];
      })
      .catch((error: unknown) => {
        payload.error = String(error);
        payload.streamingStarted = true;
        payload.body += payload.pendingChunks.join("");
        payload.pendingChunks = [];
      });
  });

  session.on("Network.dataReceived", ({ requestId, data }) => {
    if (!data) return;
    const payload = requests.get(requestId);
    if (!payload) return;
    const chunk = Buffer.from(data, "base64").toString("utf8");
    if (payload.streamingStarted) {
      payload.body += chunk;
    } else {
      payload.pendingChunks.push(chunk);
    }
  });

  session.on("Network.loadingFinished", ({ requestId }) => {
    const payload = requests.get(requestId);
    if (payload) payload.completed = true;
  });

  session.on("Network.loadingFailed", ({ requestId, errorText }) => {
    const payload = requests.get(requestId);
    if (!payload) return;
    payload.error = errorText;
    payload.completed = true;
  });

  return payloads;
}

async function expectPrefetchedBody(
  payloads: Map<string, RscPayload[]>,
  href: string,
  expectedText: string,
  options: { additionalText?: string; completed?: boolean } = {},
) {
  try {
    await expect
      .poll(() => {
        const payload = payloads
          .get(href)
          ?.find(
            (candidate) =>
              candidate.body.includes(expectedText) &&
              (!options.additionalText ||
                candidate.body.includes(options.additionalText)) &&
              (!options.completed || candidate.completed),
          );
        return payload !== undefined;
      })
      .toBe(true);
  } catch (error) {
    const diagnostics = payloads.get(href)?.map((payload) => ({
      status: payload.status,
      bytes: Buffer.byteLength(payload.body),
      hasExpectedText: payload.body.includes(expectedText),
      hasAdditionalText: options.additionalText
        ? payload.body.includes(options.additionalText)
        : undefined,
      prefetch: payload.headers["next-router-prefetch"],
      segmentPrefetch: payload.headers["next-router-segment-prefetch"],
      completed: payload.completed,
      error: payload.error,
    }));
    console.error(
      `[RSC prefetch] ${href}: ${JSON.stringify(diagnostics ?? [])}`,
    );
    throw error;
  }
}

test.describe("blog detail body prefetch", () => {
  test("@production prefetches a category list body from the menu", async ({
    page,
  }) => {
    const payloads = await captureRscPayloads(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openBlogHome(page);

    const href = "/en/list/category/engineering";
    const postTitle = "Reliable browser gates";
    const link = page.locator(`header a[href="${href}"]`).first();
    await expect(link).toBeVisible();
    await expectPrefetchedBody(payloads, href, postTitle);

    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator("main")).toContainText(postTitle);
  });

  test("@production prefetches the public article body from the list", async ({
    page,
  }) => {
    const payloads = await captureRscPayloads(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openBlogHome(page);

    const href = "/en/archives/000000000000000000000005";
    const bodyText = "Deterministic browser test content.";
    const recommendationHeading = "Guess what you like";
    const link = page.locator(`main a[href="${href}"]`).first();
    await expect(link).toBeVisible();
    await expectPrefetchedBody(payloads, href, bodyText, {
      additionalText: recommendationHeading,
      completed: true,
    });

    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator("main .prose-editor").first()).toContainText(
      bodyText,
    );
    await expect(page.locator("main")).toContainText(recommendationHeading);
  });

  test("@production prefetches the public page body from the menu", async ({
    page,
  }) => {
    const payloads = await captureRscPayloads(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openBlogHome(page);

    const href = "/en/pages/000000000000000000000006";
    const bodyText = "About the E2E site.";
    const link = page.locator(`header a[href="${href}"]`).first();
    await expect(link).toBeVisible();
    await expectPrefetchedBody(payloads, href, bodyText);

    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator("main .prose-editor").first()).toContainText(
      bodyText,
    );
  });
});
