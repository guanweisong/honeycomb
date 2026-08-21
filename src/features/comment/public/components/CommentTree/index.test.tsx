import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { name?: string }) => {
    if (key === "avatarAlt") return `${values?.name} 的头像`;
    if (key === "banMessage") return "该评论已被屏蔽";
    if (key === "form.reply") return "回复";
    return key;
  },
}));

vi.mock("@/packages/ui/blog/utc-format", () => ({
  utcFormat: (date: string) => `formatted:${date}`,
}));

import { CommentStatus } from "@/packages/domain/content/comment";
import { CommentTree } from ".";

const comments = [
  {
    id: "comment-1",
    author: "作者甲",
    content: "主评论",
    createdAt: "2026-08-18T00:00:00.000Z",
    status: "PUBLISHED",
    site: "https://example.test/author",
    avatar: "https://example.test/avatar.jpg",
    children: [
      {
        id: "comment-2",
        author: "作者乙",
        content: "回复内容",
        createdAt: "2026-08-18T01:00:00.000Z",
        status: "PUBLISHED",
        children: [],
      },
    ],
  },
  {
    id: "comment-3",
    author: "作者丙",
    content: "被屏蔽内容",
    createdAt: "2026-08-18T02:00:00.000Z",
    status: CommentStatus.BAN,
  },
];

describe("CommentTree", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("renders nested comments, external author links, and ban messages", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <ul>
          <CommentTree comments={comments as never} onReply={vi.fn()} />
        </ul>,
      ),
    );

    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(
      container.querySelector('a[href="https://example.test/author"]')
        ?.textContent,
    ).toBe("作者甲");
    expect(container.textContent).toContain("回复内容");
    expect(container.textContent).toContain("该评论已被屏蔽");
    expect(container.querySelector('img[alt="作者甲 的头像"]')).not.toBeNull();
  });

  it("passes the selected comment to the reply callback", () => {
    const onReply = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <ul>
          <CommentTree comments={comments as never} onReply={onReply} />
        </ul>,
      ),
    );

    act(() =>
      Array.from(container.querySelectorAll("a"))
        .find((link) => link.textContent === "回复")
        ?.click(),
    );

    expect(onReply).toHaveBeenCalledWith(comments[0]);
  });

  it("renders no list items for an empty comment tree", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<CommentTree comments={[]} onReply={vi.fn()} />));

    expect(container.childElementCount).toBe(0);
  });
});
