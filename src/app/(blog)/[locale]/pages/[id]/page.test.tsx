import { createTranslator } from "next-intl";
import enMessages from "@/app/(blog)/messages/en.json";
import zhMessages from "@/app/(blog)/messages/zh.json";
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PostStatus } from "@/features/post/post-status";
import { PageTemplate } from "@/features/page/page-template";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockPageDetail = vi.fn();
const mockComments = vi.fn();
const mockServerIncrementViews = vi.fn();
const mockClientIncrementViews = vi.fn();
const mockSettingIndex = vi.fn();
const mockLinks = vi.fn();
let testLocale = "zh";

vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("zh"),
  getTranslations: (namespace: "Link" | "PostInfo") =>
    Promise.resolve(
      createTranslator({
        locale: testLocale,
        messages: testLocale === "en" ? enMessages : zhMessages,
        namespace,
      }),
    ),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));
vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  useTranslations: () => (_key: string, values: { count: number }) =>
    `${values.count} views`,
}));
vi.mock("@/app/_trpc/server", () => ({
  createServerClient: async () => ({
    comment: { listByRef: mockComments },
    link: { index: mockLinks },
    page: {
      detail: mockPageDetail,
      incrementViews: mockServerIncrementViews,
    },
    setting: { index: mockSettingIndex },
  }),
}));
vi.mock("@/app/lib/server/public-queries", () => ({
  getPublicComments: (...args: unknown[]) => mockComments(...args),
  getPublicPageDetail: (...args: unknown[]) => mockPageDetail(...args),
  getPublicSetting: (...args: unknown[]) => mockSettingIndex(...args),
  getPublicLinks: (...args: unknown[]) => mockLinks(...args),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    page: {
      incrementViews: {
        useMutation: () => ({ mutate: mockClientIncrementViews }),
      },
    },
    post: { incrementViews: { useMutation: () => ({ mutate: vi.fn() }) } },
  },
}));
vi.mock("@/features/post/public/PostInfo", () => ({
  default: ({ views }: { views?: React.ReactNode }) => <>{views}</>,
  PostCommentCount: () => null,
}));
vi.mock("@/features/comment/public/components/CommentClient", () => ({
  default: () => null,
}));
vi.mock("@/features/media/public/RichText", () => ({
  RichText: ({ html }: { html?: string }) => <article>{html}</article>,
}));

import Pages, { generateMetadata } from "./page";

describe("pages detail page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    testLocale = "zh";
    mockLinks.mockReset().mockResolvedValue({ list: [], total: 0 });
    mockComments.mockReset().mockResolvedValue({ total: 0 });
    mockPageDetail.mockReset().mockResolvedValue({
      id: "page-1",
      title: { zh: "页面标题" },
      content: { zh: "页面正文" },
      status: PostStatus.PUBLISHED,
      template: PageTemplate.DEFAULT,
      imagesInContent: [],
      views: 3,
    });
    mockServerIncrementViews.mockReset();
    mockClientIncrementViews.mockReset();
    mockSettingIndex.mockReset().mockResolvedValue({
      siteName: { en: "Honeycomb", zh: "蜂巢" },
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps server rendering read-only and reports the view after mounting", async () => {
    const element = await Pages({
      params: Promise.resolve({ id: "page-1", locale: "zh" }),
      searchParams: Promise.resolve({}),
    });
    await act(async () => root.render(element));

    expect(container.textContent).toContain("页面正文");
    expect(container.querySelector("h1")?.textContent).toBe("页面标题");
    expect(mockLinks).not.toHaveBeenCalled();
    expect(mockServerIncrementViews).not.toHaveBeenCalled();
    expect(mockClientIncrementViews).toHaveBeenCalledOnce();
    expect(mockClientIncrementViews).toHaveBeenCalledWith(
      { id: "page-1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it.each(["zh", "en"])(
    "localizes the friendly-link empty state in %s",
    async (locale) => {
      testLocale = locale;
      mockPageDetail.mockResolvedValue({
        id: "page-1",
        title: { zh: "友链", en: "Links" },
        status: PostStatus.PUBLISHED,
        template: PageTemplate.FRIENDLY_LINKS,
        imagesInContent: [],
        views: 0,
      });
      await act(async () =>
        root.render(
          Pages({
            params: Promise.resolve({ id: "page-1", locale }),
            searchParams: Promise.resolve({}),
          }),
        ),
      );
      expect(container.textContent).toContain(
        locale === "en" ? enMessages.Link.emptyTip : zhMessages.Link.emptyTip,
      );
    },
  );

  it("generates localized page indexing relationships", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "page-1", locale: "zh" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata).toMatchObject({
      title: "页面标题",
      alternates: {
        canonical: "/zh/pages/page-1",
        languages: {
          en: "/en/pages/page-1",
          zh: "/zh/pages/page-1",
        },
      },
      openGraph: { images: ["/static/images/logo.png"] },
    });
  });
  it("protects the opener for friendly links opened in another tab", async () => {
    mockPageDetail.mockResolvedValue({
      id: "page-1",
      title: { zh: "友情链接" },
      content: null,
      status: PostStatus.PUBLISHED,
      template: PageTemplate.FRIENDLY_LINKS,
      imagesInContent: [],
      views: 0,
    });
    mockLinks.mockResolvedValue({
      total: 1,
      list: [
        {
          name: "Example",
          url: "https://example.test",
          logo: "https://example.test/logo.png",
        },
      ],
    });
    const element = await Pages({
      params: Promise.resolve({ id: "page-1", locale: "zh" }),
      searchParams: Promise.resolve({}),
    });
    await act(async () => root.render(element));
    expect(
      container
        .querySelector('a[target="_blank"]')
        ?.getAttribute("rel")
        ?.split(" "),
    ).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
  });
});
