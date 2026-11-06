import { test, expect } from "@playwright/test";

test.describe("blog home redirects", () => {
  for (const { path, language, cookie, target } of [
    { path: "/", language: "en-US", cookie: "", target: "/en/list/category" },
    { path: "/", language: "zh-CN", cookie: "", target: "/zh/list/category" },
    {
      path: "/?utm_source=test&tag=a%2Fb&tag=c",
      language: "en-US",
      cookie: "NEXT_LOCALE=zh",
      target: "/zh/list/category?utm_source=test&tag=a%2Fb&tag=c",
    },
    {
      path: "/zh",
      language: "en-US",
      cookie: "NEXT_LOCALE=en",
      target: "/zh/list/category",
    },
    {
      path: "/en",
      language: "zh-CN",
      cookie: "NEXT_LOCALE=zh",
      target: "/en/list/category",
    },
  ]) {
    test(`@regression ${path} redirects directly to ${target} (${language})`, async ({
      request,
    }) => {
      const response = await request.get(path, {
        maxRedirects: 0,
        headers: { "accept-language": language, cookie },
      });

      expect(response.status()).toBe(307);
      const destination = new URL(response.headers().location!, response.url());
      expect(destination.pathname + destination.search).toBe(target);
      expect(response.headers()["content-type"] ?? "").not.toContain(
        "text/html",
      );

      const finalResponse = await request.get(destination.toString(), {
        maxRedirects: 0,
      });
      expect(finalResponse.status()).toBe(200);
      expect(finalResponse.headers().location).toBeUndefined();
    });
  }

  test("@regression home reaches the cookie-selected locale without JavaScript", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      locale: "en-US",
    });
    try {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: "zh", url: baseURL! },
      ]);
      const page = await context.newPage();
      const response = await page.goto("/");

      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(/\/zh\/list\/category$/);
      await expect(page.locator("main")).toBeVisible();
      const redirect = response?.request().redirectedFrom();
      expect(new URL(redirect!.url()).pathname).toBe("/");
      expect(redirect?.redirectedFrom()).toBeNull();
    } finally {
      await context.close();
    }
  });
});
