// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "@/lib/http/client-ip.server";

function request(forwarded?: string) {
  const headers = new Headers({ "x-real-ip": "198.51.100.7" });
  if (forwarded !== undefined) headers.set("x-forwarded-for", forwarded);
  return { headers };
}

describe("getClientIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ignores forwarded headers without an explicit proxy contract", () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", undefined);
    vi.stubEnv("VERCEL", undefined);
    expect(getClientIp(request("203.0.113.8"))).toBe("anonymous");
  });

  it("uses the platform-owned Vercel header only in the Vercel environment", () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", undefined);
    vi.stubEnv("VERCEL", "1");
    const incoming = request("203.0.113.8");
    incoming.headers.set("x-vercel-forwarded-for", "192.0.2.5");
    expect(getClientIp(incoming)).toBe("192.0.2.5");
    incoming.headers.set("x-vercel-forwarded-for", "192.0.2.5, 10.0.0.1");
    expect(getClientIp(incoming)).toBe("anonymous");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
    expect(getClientIp(incoming)).toBe("anonymous");
  });

  it("selects the client at the trusted right edge of a multi-hop chain", () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    expect(getClientIp(request("spoofed, 203.0.113.8, 10.0.0.1"))).toBe(
      "203.0.113.8",
    );
  });

  it.each([
    undefined,
    "203.0.113.8",
    "203.0.113.8, invalid",
    ", 10.0.0.1",
    "203.0.113.8:8080, 10.0.0.1",
    "fe80::1%eth0, 10.0.0.1",
  ])(
    "uses the anonymous bucket for an incomplete or invalid trusted suffix",
    (chain) => {
      vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
      expect(getClientIp(request(chain))).toBe("anonymous");
    },
  );

  it.each([
    ["2001:0DB8:0:0::1", "2001:db8::1"],
    ["::ffff:203.0.113.8", "203.0.113.8"],
  ])("canonicalizes %s", (source, canonical) => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    expect(getClientIp(request(source))).toBe(canonical);
  });
});
