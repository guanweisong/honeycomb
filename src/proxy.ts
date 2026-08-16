import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/app/(blog)/i18n/routing";
import { apiRatelimit } from "@/packages/infrastructure/rate-limit/rate-limit";
import { getClientIp } from "@/packages/infrastructure/http/client-ip";

const i18nMiddleware = createMiddleware(routing);

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const identifier = getClientIp(req);
    const { success, limit, remaining, reset, unavailable } =
      await apiRatelimit.limit(identifier);

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          code: unavailable ? 503 : 429,
          message: unavailable
            ? "API rate limiting is temporarily unavailable."
            : "Too many requests, please try again later.",
        }),
        {
          status: unavailable ? 503 : 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(reset));
    return response;
  }

  return i18nMiddleware(req);
}

export const config = {
  matcher: ["/api/:path*", "/((?!api|trpc|_next|_vercel|admin|.*\\..*).*)"],
};
