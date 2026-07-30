import { expect, test } from "@playwright/test";

import { resolveAssetOrigin } from "./security-headers-config";

const VERCEL_SCRIPT_ORIGIN = "https://va.vercel-scripts.com";
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const CONFIGURED_ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL ?? "https://assets.honeycomb.test";
const ASSET_ORIGIN = resolveAssetOrigin(CONFIGURED_ASSET_URL);

function getCsp(headers: Record<string, string>) {
  const enforced = headers["content-security-policy"];
  const reportOnly = headers["content-security-policy-report-only"];

  expect(Boolean(enforced) || Boolean(reportOnly)).toBe(true);
  expect(Boolean(enforced) && Boolean(reportOnly)).toBe(false);

  return enforced ?? reportOnly ?? "";
}

test.describe("security response headers", () => {
  test("@regression protects blog, admin, and PWA routes without contacting third parties", async ({
    request,
  }) => {
    const [blog, login, manifest] = await Promise.all([
      request.get("/en/list/category"),
      request.get("/admin/login"),
      request.get("/manifest.webmanifest"),
    ]);

    for (const response of [blog, login, manifest]) {
      expect(response.ok()).toBe(true);

      const headers = response.headers();
      const csp = getCsp(headers);

      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(headers["permissions-policy"]).toContain("camera=()");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    }

    const blogCsp = getCsp(blog.headers());
    expect(blogCsp).toContain("worker-src 'self' blob:");
    expect(blogCsp).toContain("manifest-src 'self'");
  });

  test("@regression browser routes remain usable without live third-party services", async ({
    page,
  }) => {
    const cspConsoleMessages: string[] = [];
    const interceptedRequests = new Set<string>();

    page.on("console", (message) => {
      if (
        /content security policy|violates the following content security policy directive/i.test(
          message.text(),
        )
      ) {
        cspConsoleMessages.push(message.text());
      }
    });
    await page.addInitScript(() => {
      const violations: string[] = [];
      Object.defineProperty(window, "__cspViolations", { value: violations });
      document.addEventListener("securitypolicyviolation", (event) => {
        violations.push(`${event.effectiveDirective}: ${event.blockedURI}`);
      });
    });
    await page.route(`${VERCEL_SCRIPT_ORIGIN}/**`, async (route) => {
      interceptedRequests.add("vercel-script");
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "globalThis.__vercelCspProbe = true;",
      });
    });
    await page.route(`${TURNSTILE_ORIGIN}/**`, async (route) => {
      const resourceType = route.request().resourceType();
      interceptedRequests.add(
        resourceType === "document" ? "turnstile-frame" : "turnstile-script",
      );
      await route.fulfill({
        status: 200,
        contentType:
          resourceType === "document" ? "text/html" : "application/javascript",
        body:
          resourceType === "document"
            ? "<!doctype html><title>probe</title>"
            : "",
      });
    });
    await page.route(`${ASSET_ORIGIN}/**`, async (route) => {
      interceptedRequests.add("remote-asset");
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    });
    await page.route("https://www.google.com/**", async (route) => {
      interceptedRequests.add("google-analytics-connect");
      await route.fulfill({ status: 204 });
    });
    await page.route("**/_vercel/insights/csp-probe", async (route) => {
      interceptedRequests.add("vercel-analytics-connect");
      await route.fulfill({ status: 204 });
    });
    await page.route("**/_vercel/speed-insights/csp-probe", async (route) => {
      interceptedRequests.add("vercel-speed-connect");
      await route.fulfill({ status: 204 });
    });

    const blogResponse = await page.goto("/en/list/category", {
      waitUntil: "domcontentloaded",
    });
    expect(blogResponse?.ok()).toBe(true);
    await expect(page.locator("main")).toBeVisible();

    const blogCsp = getCsp(blogResponse!.headers());
    expect(blogCsp).toContain(VERCEL_SCRIPT_ORIGIN);
    expect(blogCsp).toContain(TURNSTILE_ORIGIN);
    expect(blogCsp).toContain(ASSET_ORIGIN);

    await page.evaluate(
      async ({ vercelScriptOrigin, turnstileOrigin, assetOrigin }) => {
        const loadScript = (src: string) =>
          new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`script blocked: ${src}`));
            document.head.appendChild(script);
          });
        const loadImage = (src: string) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.src = src;
            image.onload = () => resolve();
            image.onerror = () => reject(new Error(`image blocked: ${src}`));
          });
        const loadFrame = (src: string) =>
          new Promise<void>((resolve, reject) => {
            const frame = document.createElement("iframe");
            frame.src = src;
            frame.onload = () => resolve();
            frame.onerror = () => reject(new Error(`frame blocked: ${src}`));
            document.body.appendChild(frame);
          });

        await Promise.all([
          loadScript(`${vercelScriptOrigin}/v1/csp-probe.js`),
          loadScript(`${turnstileOrigin}/turnstile/v0/csp-probe.js`),
          loadFrame(`${turnstileOrigin}/turnstile/v0/csp-probe-frame`),
          loadImage(`${assetOrigin}/csp-probe.png`),
          fetch("/_vercel/insights/csp-probe"),
          fetch("/_vercel/speed-insights/csp-probe"),
        ]);
      },
      {
        vercelScriptOrigin: VERCEL_SCRIPT_ORIGIN,
        turnstileOrigin: TURNSTILE_ORIGIN,
        assetOrigin: ASSET_ORIGIN,
      },
    );

    for (const requestName of [
      "vercel-script",
      "turnstile-script",
      "turnstile-frame",
      "remote-asset",
      "vercel-analytics-connect",
      "vercel-speed-connect",
    ]) {
      expect(interceptedRequests).toContain(requestName);
    }

    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .first()
      .getAttribute("href");
    expect(manifestHref).toBe("/manifest.webmanifest");
    const manifest = await page.request.get(manifestHref!);
    expect(manifest.ok()).toBe(true);
    expect(manifest.headers()["content-type"]).toContain(
      "application/manifest+json",
    );

    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const registration =
              await navigator.serviceWorker.getRegistration();
            return (
              registration?.active?.scriptURL ??
              registration?.installing?.scriptURL ??
              registration?.waiting?.scriptURL ??
              ""
            );
          }),
        { timeout: 15_000 },
      )
      .toContain("/serwist/sw.js");

    const offlineResponse = await page.goto("/en/offline", {
      waitUntil: "domcontentloaded",
    });
    expect(offlineResponse?.ok()).toBe(true);
    await expect(page.locator("main")).toBeVisible();

    const loginResponse = await page.goto("/admin/login", {
      waitUntil: "domcontentloaded",
    });
    expect(loginResponse?.ok()).toBe(true);
    await expect(page.getByPlaceholder("用户名")).toBeVisible();
    await expect(page.getByPlaceholder("密码")).toBeVisible();
    await page.waitForTimeout(300);

    const browserViolations = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __cspViolations: string[];
          }
        ).__cspViolations,
    );
    expect(cspConsoleMessages).toEqual([]);
    // Chromium may attribute Playwright's main-world evaluation bridge to an
    // eval attempt. It is not application code and no resource is allowed by it.
    expect(
      browserViolations.filter((violation) => violation !== "script-src: eval"),
    ).toEqual([]);
  });
});
