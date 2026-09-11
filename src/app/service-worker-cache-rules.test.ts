import { describe, expect, it } from "vitest";
import { isPublicRuntimeRequest } from "./service-worker-cache-rules";

function request(pathname: string, sameOrigin = true) {
  return {
    sameOrigin,
    url: new URL(pathname, "https://honeycomb.test"),
  };
}

describe("Service Worker runtime cache boundaries", () => {
  it.each(["/api", "/api/auth/session", "/admin", "/admin/post/edit"])(
    "does not cache private request %s",
    (pathname) => {
      expect(isPublicRuntimeRequest(request(pathname))).toBe(false);
    },
  );

  it("accepts same-origin public requests but not cross-origin requests", () => {
    expect(isPublicRuntimeRequest(request("/en/posts"))).toBe(true);
    expect(isPublicRuntimeRequest(request("/en/posts", false))).toBe(false);
  });
});
