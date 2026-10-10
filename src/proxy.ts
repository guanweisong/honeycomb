import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/packages/ui/navigation/routing";
import {
  apiRatelimit,
  limitWithTimeout,
} from "@/packages/infrastructure/rate-limit/rate-limit";
import { getClientIp } from "@/packages/infrastructure/http/client-ip";
import { ADMIN_PATHNAME_HEADER } from "@/app/admin/constants/route-capabilities";

const i18nMiddleware = createMiddleware(routing);

export function createAdminRequestHeaders(
  headers: Headers,
  pathname: string,
): Headers {
  const requestHeaders = new Headers(headers);
  requestHeaders.set(ADMIN_PATHNAME_HEADER, pathname);
  return requestHeaders;
}

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const identifier = getClientIp(req);
    const { success, limit, remaining, reset, unavailable } =
      await limitWithTimeout(apiRatelimit, identifier);

    if (!success && !unavailable) {
      return new NextResponse(
        JSON.stringify({
          code: 429,
          message: "Too many requests, please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        },
      );
    }

    // Keep general API traffic available when Upstash is down. Sensitive
    // procedures such as comment creation enforce their own separate limits.
    const response = NextResponse.next();
    if (!unavailable) {
      response.headers.set("X-RateLimit-Limit", String(limit));
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      response.headers.set("X-RateLimit-Reset", String(reset));
    }
    return response;
  }

  if (req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next({
      request: {
        headers: createAdminRequestHeaders(req.headers, req.nextUrl.pathname),
      },
    });
  }

  return i18nMiddleware(req);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/((?!api|trpc|_next|_vercel|admin|.*\\..*).*)",
  ],
};
