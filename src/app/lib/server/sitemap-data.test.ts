import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (loader: unknown) => loader,
}));

import { toSitemapIndexXml, toSitemapXml } from "./sitemap-data";

describe("runtime sitemap", () => {
  it("escapes every XML entity and omits an absent modification date", () => {
    const sitemap = toSitemapXml([
      {
        url: "https://example.com/<tag>?a=1&b='quoted'\"",
        changeFrequency: "daily",
        priority: 0.5,
      },
    ]);
    const index = toSitemapIndexXml(
      "https://example.com/<root>?a=1&b='x'\"",
      1,
    );

    expect(sitemap).toContain(
      "https://example.com/&lt;tag&gt;?a=1&amp;b=&apos;quoted&apos;&quot;",
    );
    expect(sitemap).not.toContain("<lastmod>");
    expect(index).toContain(
      "https://example.com/&lt;root&gt;?a=1&amp;b=&apos;x&apos;&quot;/sitemaps/0.xml",
    );
  });
});
