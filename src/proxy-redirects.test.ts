// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit/rate-limit", () => ({
  apiRatelimit: {},
  limitWithTimeout: vi.fn(),
}));

import { proxy } from "@/proxy";

const origin = "https://www.example.com";

describe("blog home redirects", () => {
  it.each([
    { path: "/", language: "", cookie: "", target: "/en/list/category" },
    {
      path: "/",
      language: "zh-CN,zh;q=0.9,en;q=0.8",
      cookie: "",
      target: "/zh/list/category",
    },
    {
      path: "/",
      language: "en-GB,en;q=0.9,zh;q=0.8",
      cookie: "",
      target: "/en/list/category",
    },
    {
      path: "/",
      language: "fr-FR,fr;q=0.9",
      cookie: "",
      target: "/en/list/category",
    },
    {
      path: "/",
      language: "en",
      cookie: "NEXT_LOCALE=zh",
      target: "/zh/list/category",
    },
    {
      path: "/",
      language: "zh",
      cookie: "NEXT_LOCALE=en",
      target: "/en/list/category",
    },
    {
      path: "/",
      language: "zh",
      cookie: "NEXT_LOCALE=fr",
      target: "/zh/list/category",
    },
    {
      path: "/zh",
      language: "en",
      cookie: "NEXT_LOCALE=en",
      target: "/zh/list/category",
    },
    {
      path: "/en",
      language: "zh",
      cookie: "NEXT_LOCALE=zh",
      target: "/en/list/category",
    },
    {
      path: "/?utm_source=test&tag=a%2Fb&tag=c",
      language: "zh",
      cookie: "",
      target: "/zh/list/category?utm_source=test&tag=a%2Fb&tag=c",
    },
    {
      path: "/en?utm_source=test",
      language: "zh",
      cookie: "",
      target: "/en/list/category?utm_source=test",
    },
  ])(
    "redirects $path directly to $target ($language; $cookie)",
    async ({ path, language, cookie, target }) => {
      const headers = { "accept-language": language, cookie };
      const response = await proxy(
        new NextRequest(`${origin}${path}`, { headers }),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`${origin}${target}`);
      expect(response.headers.get("x-middleware-next")).toBeNull();
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(await response.text()).toBe("");

      const destination = await proxy(
        new NextRequest(`${origin}${target}`, { headers }),
      );
      expect(destination.status).toBe(200);
      expect(destination.headers.get("location")).toBeNull();
    },
  );

  it.each([
    { path: "/", language: "zh", cookie: "fr", expected: "zh" },
    { path: "/zh", language: "en", cookie: "en", expected: "zh" },
    { path: "/en", language: "zh", cookie: "zh", expected: "en" },
  ])(
    "preserves the locale cookie update for $path",
    async ({ path, language, cookie, expected }) => {
      const response = await proxy(
        new NextRequest(`${origin}${path}`, {
          headers: {
            "accept-language": language,
            cookie: `NEXT_LOCALE=${cookie}`,
          },
        }),
      );

      expect(response.cookies.get("NEXT_LOCALE")).toMatchObject({
        value: expected,
        path: "/",
        sameSite: "lax",
      });
    },
  );

  it("keeps ordinary unprefixed routes on the existing locale redirect", async () => {
    const response = await proxy(
      new NextRequest(`${origin}/list/category?sort=latest`, {
        headers: { "accept-language": "zh" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/zh/list/category?sort=latest`,
    );
  });

  it.each(["/en/list/category", "/zh/archives/post-id", "/en/unknown"])(
    "does not redirect the localized route %s",
    async (path) => {
      const response = await proxy(new NextRequest(`${origin}${path}`));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );
});
