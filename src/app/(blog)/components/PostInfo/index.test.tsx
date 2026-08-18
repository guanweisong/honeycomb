import React, { type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    ViewTransition: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count: number }) =>
    key === "messages"
      ? `${values?.count ?? 0} 条评论`
      : `${values?.count ?? 0} 次浏览`,
}));

vi.mock("@/packages/ui/blog/utc-format", () => ({
  utcFormat: (date: string) => `formatted:${date}`,
}));

vi.mock("@/packages/ui/navigation/blog-navigation", () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import PostInfo, { Align, type PostInfoProps } from ".";

describe("PostInfo", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  const render = (props: PostInfoProps) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<PostInfo {...props} />));
  };

  it("renders author, date, comments, and views in order", () => {
    render({
      id: "post-1",
      author: "作者甲",
      authorId: "author-1",
      date: "2026-08-18T00:00:00.000Z",
      comments: 3,
      views: 42,
    });

    expect(container.textContent).toBe(
      "作者甲/formatted:2026-08-18T00:00:00.000Z/3 条评论/42 次浏览",
    );
    expect(container.querySelector('a[href="/list/authors/author-1"]')?.textContent).toBe(
      "作者甲",
    );
  });

  it("applies left alignment when requested", () => {
    render({ author: "作者甲", align: Align.Left });

    expect(container.firstElementChild?.className).toContain("justify-start");
    expect(container.firstElementChild?.className).not.toContain("justify-center");
  });

  it("renders nothing when no metadata is provided", () => {
    render({});

    expect(container.firstElementChild).toBeNull();
  });
});
