// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted((): { NEXT_PUBLIC_SITE_URL: string | undefined } => ({
  NEXT_PUBLIC_SITE_URL: undefined,
}));
vi.mock("@/env/client", () => ({ clientEnv: env }));
import robots from "@/app/robots";

beforeEach(() => {
  env.NEXT_PUBLIC_SITE_URL = undefined;
});

describe("robots metadata route", () => {
  it("permits public crawling but excludes private API and admin routes", () => {
    expect(robots().rules).toEqual([
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
    ]);
  });
  it.each([
    ["https://example.test", "https://example.test/sitemap.xml"],
    [
      "https://example.test/nested/?q=1#section",
      "https://example.test/sitemap.xml",
    ],
    ["http://localhost:3100/site", "http://localhost:3100/sitemap.xml"],
  ])("uses the configured origin, not the path: %s", (url, expected) => {
    env.NEXT_PUBLIC_SITE_URL = url;
    expect(robots().sitemap).toBe(expected);
  });
  it("does not advertise an invented sitemap when the site URL is absent", () => {
    expect(robots().sitemap).toBeUndefined();
  });
});
