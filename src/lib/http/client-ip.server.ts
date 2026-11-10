import "server-only";

import { parseTrustedProxyEnv } from "@/env/schema";
import { parseForwardedClientIp, parseIp } from "@/lib/http/client-ip";

export const AUTH_CLIENT_IP_HEADER = "x-honeycomb-client-ip";
export const ANONYMOUS_CLIENT_IP = "anonymous";

export function getClientIp(request: Pick<Request, "headers">): string {
  const { TRUSTED_PROXY_HOPS: hops } = parseTrustedProxyEnv(process.env);
  if (hops === undefined && process.env.VERCEL === "1") {
    return (
      parseIp(request.headers.get("x-vercel-forwarded-for") ?? "") ??
      ANONYMOUS_CLIENT_IP
    );
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (!hops || !forwarded) return ANONYMOUS_CLIENT_IP;
  return parseForwardedClientIp(forwarded, hops) ?? ANONYMOUS_CLIENT_IP;
}
