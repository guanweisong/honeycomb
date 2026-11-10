import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

/**
 * Proxy 集成单元测试。
 * 覆盖 API 限流行为与非 API 请求的 i18n 分流行为。
 */

const { limitMock, i18nHandlerMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  i18nHandlerMock: vi.fn(() => new Response("i18n", { status: 200 })),
}));

vi.mock("@/lib/rate-limit/rate-limit", () => ({
  apiRatelimit: {
    limit: limitMock,
  },
  limitWithTimeout: (_limiter: unknown, identifier: string) =>
    limitMock(identifier),
}));

vi.mock("next-intl/middleware", () => ({
  default: () => i18nHandlerMock,
}));

vi.mock("next/server", async () => {
  class NextResponse extends Response {
    static next() {
      return new NextResponse(null, { status: 200 });
    }
  }

  return {
    NextResponse,
  };
});

import { createAdminRequestHeaders, proxy } from "@/proxy";

type ProxyRequestShape = Pick<NextRequest, "headers" | "nextUrl">;

function createProxyRequest(pathname: string): NextRequest {
  const req: ProxyRequestShape = {
    nextUrl: { pathname } as NextRequest["nextUrl"],
    headers: new Headers(),
  };

  return req as NextRequest;
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses the same trusted suffix as the independent API procedures", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    limitMock.mockResolvedValue({
      success: true,
      limit: 120,
      remaining: 119,
      reset: 1,
    });
    const request = createProxyRequest("/api/trpc/comment.create");
    request.headers.set("x-forwarded-for", "spoofed, 203.0.113.10, 10.0.0.1");

    expect((await proxy(request)).status).toBe(200);
    expect(limitMock).toHaveBeenCalledExactlyOnceWith("203.0.113.10");
  });

  it("returns 429 for API request when rate limit exceeded", async () => {
    limitMock.mockResolvedValue({
      success: false,
      limit: 120,
      remaining: 0,
      reset: 123456,
    });

    const req = createProxyRequest("/api/trpc/post.list");

    const res = await proxy(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body).toEqual({
      code: 429,
      message: "Too many requests, please try again later.",
    });
    expect(res.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe("123456");
  });

  it("allows API requests when rate limiting is unavailable", async () => {
    limitMock.mockResolvedValue({
      success: false,
      unavailable: true,
      limit: 120,
      remaining: 0,
      reset: 123456,
    });

    const res = await proxy(createProxyRequest("/api/trpc/post.list"));

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
    expect(res.headers.get("X-RateLimit-Remaining")).toBeNull();
    expect(res.headers.get("X-RateLimit-Reset")).toBeNull();
  });

  it("delegates non-API request to i18n proxy", async () => {
    const req = createProxyRequest("/zh/list/category");

    const res = await proxy(req);

    expect(i18nHandlerMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("i18n");
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("把可信后台 pathname 写入上游请求头并覆盖客户端伪造值", () => {
    const incoming = new Headers({
      "x-honeycomb-admin-pathname": "/admin/user",
    });

    const result = createAdminRequestHeaders(incoming, "/admin/tag");

    expect(result.get("x-honeycomb-admin-pathname")).toBe("/admin/tag");
  });

  it("后台请求绕过 i18n 并进入服务端 route guard", async () => {
    const res = await proxy(createProxyRequest("/admin/tag"));

    expect(res.status).toBe(200);
    expect(i18nHandlerMock).not.toHaveBeenCalled();
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("returns 200 for API request when rate limit allows and sets headers", async () => {
    limitMock.mockResolvedValue({
      success: true,
      limit: 120,
      remaining: 119,
      reset: 123999,
    });

    const req = createProxyRequest("/api/trpc/post.list");

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("119");
    expect(res.headers.get("X-RateLimit-Reset")).toBe("123999");
    expect(i18nHandlerMock).not.toHaveBeenCalled();
  });
});
