import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

/**
 * Proxy 集成单元测试。
 * 覆盖 API 限流行为与非 API 请求的 i18n 分流行为。
 */

const { limitMock, getClientIpMock, i18nHandlerMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  getClientIpMock: vi.fn(() => "127.0.0.1"),
  i18nHandlerMock: vi.fn(() => new Response("i18n", { status: 200 })),
}));

vi.mock("@/packages/trpc/api/utils/rate-limit", () => ({
  apiRatelimit: {
    limit: limitMock,
  },
  getClientIp: getClientIpMock,
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

import proxy from "../src/proxy";

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

  it("delegates non-API request to i18n proxy", async () => {
    const req = createProxyRequest("/zh");

    const res = await proxy(req);

    expect(i18nHandlerMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("i18n");
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
