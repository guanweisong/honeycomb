import { expect, test, type Page } from "@playwright/test";
import { openBlogHome } from "@tests/e2e/blog/helpers";

type RscPayload = {
  path: string;
  headers: Record<string, string>;
  body: string;
  pendingChunks: string[];
  streamingStarted: boolean;
  streamUnavailable?: boolean;
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
        payload.streamUnavailable = true;
        payload.streamingStarted = true;
        payload.body += payload.pendingChunks.join("");
        payload.pendingChunks = [];
        if (payload.completed) readCompletedResponse(requestId, payload);
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
    if (!payload) return;
    payload.completed = true;
    if (payload.streamUnavailable) readCompletedResponse(requestId, payload);
  });

  session.on("Network.loadingFailed", ({ requestId, errorText }) => {
    const payload = requests.get(requestId);
    if (!payload) return;
    payload.error = errorText;
    payload.completed = true;
  });

  function readCompletedResponse(requestId: string, payload: RscPayload) {
    void session
      .send("Network.getResponseBody", { requestId })
      .then(({ body, base64Encoded }) => {
        payload.body = base64Encoded
          ? Buffer.from(body, "base64").toString("utf8")
          : body;
      })
      .catch((error: unknown) => {
        payload.error = `${payload.error ?? ""}; response body fallback: ${String(error)}`;
      });
  }

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
              (!options.completed ||
                (candidate.completed &&
                  candidate.status !== undefined &&
                  candidate.status >= 200 &&
                  candidate.status < 300)),
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

async function expectDetailRefreshInFirstDocument(
  page: Page,
  href: string,
  bodyText: string,
) {
  const response = await page.goto(href, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  const html = await response!.text();
  const mainStart = html.indexOf("<main");
  const mainEnd = html.indexOf("</main>", mainStart);
  const footerStart = html.indexOf("<footer", mainEnd);

  expect(mainStart).toBeGreaterThanOrEqual(0);
  expect(mainEnd).toBeGreaterThan(mainStart);
  expect(footerStart).toBeGreaterThan(mainEnd);
  expect(html.slice(0, mainStart)).toContain("Honeycomb E2E");
  expect(html.slice(mainStart, mainEnd)).toContain(bodyText);
  expect(html.slice(footerStart)).toContain("Deterministic test site");

  await expect(page.locator("main .prose-editor").first()).toContainText(
    bodyText,
  );
}

test.describe("blog detail body prefetch", () => {
  test("@production renders the public article body between header and footer on refresh", async ({
    page,
  }) => {
    const href = "/en/archives/000000000000000000000005";
    await expectDetailRefreshInFirstDocument(
      page,
      href,
      "Deterministic browser test content.",
    );
  });

  test("@production renders the public page body between header and footer on refresh", async ({
    page,
  }) => {
    const href = "/en/pages/000000000000000000000006";
    await expectDetailRefreshInFirstDocument(
      page,
      href,
      "About the E2E site.",
    );
  });

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

    let navigationResponseReleased = false;
    let releaseNavigationResponse: (() => void) | undefined;
    await page.route("**/*", async (route) => {
      const request = route.request();
      const headers = request.headers();
      if (
        new URL(request.url()).pathname === href &&
        headers.rsc === "1" &&
        !headers["next-router-prefetch"] &&
        !navigationResponseReleased
      ) {
        await new Promise<void>((resolve) => {
          releaseNavigationResponse = resolve;
        });
      }
      await route.continue();
    });

    const navigation = link.click();
    navigation.catch(() => undefined);
    try {
      await expect(page.locator("main .prose-editor").first()).toContainText(
        bodyText,
        { timeout: 2000 },
      );
      await expect(page.locator("main")).toContainText(
        recommendationHeading,
      );
    } finally {
      navigationResponseReleased = true;
      releaseNavigationResponse?.();
    }
    await navigation;
    await expect(page).toHaveURL(href);
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
