import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/app/(blog)/messages/zh.json";
import PostSearch from ".";

const search = vi.hoisted(() => vi.fn());
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    sizes,
  }: {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} sizes={sizes} />
  ),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpcClient: { post: { search: { query: search } } },
}));
vi.mock("@/lib/i18n/blog-navigation", () => ({
  Link: ({
    children,
    href,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      href={`/zh${href}`}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const advanceTime = async (ms = 300) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
function button(label: string) {
  const found = Array.from(document.querySelectorAll("button")).find(
    (item) =>
      item.getAttribute("aria-label") === label || item.textContent === label,
  );
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}
function input() {
  const element = document.querySelector<HTMLInputElement>(
    'input[type="search"]',
  );
  if (!element) throw new Error("Missing search input");
  return element;
}
async function type(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function open() {
  await act(async () => button("搜索").click());
  await advanceTime(10);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  search.mockReset().mockResolvedValue([]);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="zh" messages={messages}>
          <PostSearch />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    ),
  );
});
afterEach(async () => {
  try {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});

describe("public blog search", () => {
  it("uses quote body text without a title or untitled fallback and retains comfortable inner result padding", async () => {
    search.mockResolvedValue([
      {
        id: "quote-titled",
        title: "不应展示的标题",
        excerpt: "引用正文",
        type: "QUOTE",
        cover: null,
      },
      {
        id: "quote-untitled",
        title: "",
        excerpt: "另一段引用",
        type: "QUOTE",
        cover: null,
      },
    ]);
    await open();
    await type("引用");
    await advanceTime();
    await advanceTime(10);
    expect(document.body.textContent).not.toContain("不应展示的标题");
    expect(document.body.textContent).not.toContain("无标题");
    const link = document.querySelector('a[href="/zh/archives/quote-titled"]');
    expect(link?.textContent).toContain("引用正文");
    expect(link?.querySelector("p")?.className).toContain("font-medium");
    expect(link?.className.split(" ")).toContain("px-3");
  });

  it("keeps the server-rendered trigger disabled until the client is ready", () => {
    const html = renderToString(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="zh" messages={messages}>
          <PostSearch />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(
      document
        .querySelector('button[aria-label="搜索"]')
        ?.hasAttribute("disabled"),
    ).toBe(true);
    expect(button("搜索").disabled).toBe(false);
  });

  it("opens an accessible dialog, focuses the input, and restores trigger focus on Escape", async () => {
    await open();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(input());
    expect(search).not.toHaveBeenCalled();
    await act(async () =>
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    await advanceTime(10);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(button("搜索"));
  });

  it("debounces current-language queries and displays only safe result text and localized links", async () => {
    search.mockResolvedValue([
      {
        id: "post-one",
        title: "中文标题",
        excerpt: "<img src=x onerror=alert(1)>",
        type: "ARTICLE",
      },
    ]);
    await open();
    await type("h");
    await advanceTime(299);
    expect(search).not.toHaveBeenCalled();
    await type("  hello  ");
    await advanceTime(299);
    expect(search).not.toHaveBeenCalled();
    await advanceTime(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toEqual({ query: "hello", locale: "zh" });
    await advanceTime(10);
    const link = document.querySelector<HTMLAnchorElement>(
      'a[href="/zh/archives/post-one"]',
    );
    expect(link?.textContent).toContain("中文标题");
    expect(link?.textContent).toContain("文章");
    expect(link?.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(link?.querySelector("img")).toBeNull();
    await act(async () => link!.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await open();
    expect(input().value).toBe("");
  });

  it("does not search during IME composition or for whitespace", async () => {
    await open();
    await act(async () =>
      input().dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      ),
    );
    await type("中文");
    await advanceTime();
    await advanceTime(10);
    expect(search).not.toHaveBeenCalled();
    await act(async () =>
      input().dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true }),
      ),
    );
    await advanceTime();
    await advanceTime(10);
    expect(search.mock.calls[0]?.[0]).toEqual({ query: "中文", locale: "zh" });
    await type("   ");
    await advanceTime();
    await advanceTime(10);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state, a retryable failure, then empty results", async () => {
    let reject!: (reason: Error) => void;
    search.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    await open();
    await type("missing");
    await advanceTime();
    await advanceTime(10);
    expect(document.body.textContent).toContain("搜索中");
    await act(async () => reject(new Error("offline")));
    await advanceTime(10);
    expect(document.body.textContent).toContain("搜索失败");
    await act(async () => button("重试").click());
    await advanceTime(10);
    expect(search).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain("没有找到相关内容");
  });

  it("hides older results immediately while a new query is debouncing", async () => {
    search.mockResolvedValue([
      { id: "old", title: "旧结果", excerpt: "old", type: "ARTICLE" },
    ]);
    await open();
    await type("old");
    await advanceTime();
    await advanceTime(10);
    expect(document.body.textContent).toContain("旧结果");
    await type("new");
    expect(document.body.textContent).not.toContain("旧结果");
  });
  it("gives untitled results an accessible fallback and ignores late responses for older queries", async () => {
    let resolveOld!: (value: unknown) => void;
    search.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    search.mockResolvedValueOnce([
      { id: "new", title: "", excerpt: "新的内容", type: "ARTICLE" },
    ]);
    await open();
    await type("old");
    await advanceTime();
    await type("new");
    await advanceTime();
    await advanceTime(10);
    expect(document.body.textContent).toContain("无标题");
    expect(document.body.textContent).toContain("新的内容");
    await act(async () =>
      resolveOld([
        { id: "old", title: "旧结果", excerpt: "old", type: "ARTICLE" },
      ]),
    );
    await advanceTime(10);
    expect(document.body.textContent).not.toContain("旧结果");
  });
  it("cancels an in-flight request when closed", async () => {
    search.mockImplementationOnce(() => new Promise(() => {}));
    await open();
    await type("pending");
    await advanceTime();
    const options = search.mock.calls[0]?.[1] as { signal: AbortSignal };
    expect(options.signal.aborted).toBe(false);
    await act(async () => button("关闭搜索").click());
    expect(options.signal.aborted).toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it("shows an optional cover thumbnail without reserving a placeholder for uncovered results", async () => {
    search.mockResolvedValue([
      {
        id: "covered",
        title: "有封面",
        excerpt: "正文",
        type: "ARTICLE",
        cover: { url: "https://assets.example.test/cover.jpg" },
      },
      {
        id: "plain",
        title: "无封面",
        excerpt: "正文",
        type: "QUOTE",
        cover: null,
      },
    ]);
    await open();
    await type("正文");
    await advanceTime();
    await advanceTime(10);
    const covered = document.querySelector('a[href="/zh/archives/covered"]');
    const plain = document.querySelector('a[href="/zh/archives/plain"]');
    expect(covered?.querySelector("img")?.getAttribute("src")).toBe(
      "https://assets.example.test/cover.jpg",
    );
    expect(covered?.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(plain?.querySelector("img")).toBeNull();
    expect(plain?.querySelector('[data-testid="search-cover"]')).toBeNull();
  });
});
