import { describe, expect, it, vi } from "vitest";
// Keep the wrapper real; next-intl's runtime requires Next's server resolver.
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({ Link: () => null }),
}));

import { Link } from "@/lib/i18n/blog-navigation";

describe("blog Link prefetch policy", () => {
  it("prefetches URL-specific content by default and preserves navigation props", () => {
    const onClick = vi.fn();
    const link = Link({ href: "/archives/post-1", children: "Read", onClick });

    expect(link.props.prefetch).toBe(true);
    expect(link.props.href).toBe("/archives/post-1");
    expect(link.props.children).toBe("Read");
    expect(link.props.onClick).toBe(onClick);
  });

  it.each([true, false, "auto", null] as const)(
    "honors explicit prefetch=%s",
    (prefetch) => {
      expect(Link({ href: "/list/tags/tag-1", prefetch }).props.prefetch).toBe(
        prefetch,
      );
    },
  );

  it("treats explicit undefined as the blog default", () => {
    expect(
      Link({ href: "/archives/post-1", prefetch: undefined }).props.prefetch,
    ).toBe(true);
  });
});
