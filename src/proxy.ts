import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/app/(blog)/i18n/routing";
import { apiRatelimit, getClientIp } from "@/packages/trpc/api/utils/rate-limit";

const i18nProxy = createMiddleware(routing);

export default async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const identifier = getClientIp(req);
    const { success, limit, remaining, reset } = await apiRatelimit.limit(
      identifier,
    );

    if (!success) {
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

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(reset));
    return response;
  }

  return i18nProxy(req);
}

export const config = {
  matcher: ["/api/:path*", "/((?!api|trpc|_next|_vercel|admin|.*\\..*).*)"],
};
