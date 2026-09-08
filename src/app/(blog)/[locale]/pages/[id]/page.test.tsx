import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PageTemplate } from "@/packages/domain/content/page-template";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mockPageDetail = vi.fn();
const mockComments = vi.fn();
const mockServerIncrementViews = vi.fn();
const mockClientIncrementViews = vi.fn();

vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("zh") }));
vi.mock("next-intl", () => ({
  useTranslations: () => (_key: string, values: { count: number }) =>
    `${values.count} views`,
}));
vi.mock("@/packages/trpc/api", () => ({
  createServerClient: async () => ({
    comment: { listByRef: mockComments },
    link: { index: vi.fn() },
    page: {
      detail: mockPageDetail,
      incrementViews: mockServerIncrementViews,
    },
    setting: { index: vi.fn() },
  }),
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    page: {
      incrementViews: {
        useMutation: () => ({ mutate: mockClientIncrementViews }),
      },
    },
    post: { incrementViews: { useMutation: () => ({ mutate: vi.fn() }) } },
  },
}));
vi.mock("@/app/(blog)/components/PostInfo", () => ({
  default: ({ views }: { views?: React.ReactNode }) => <>{views}</>,
}));
vi.mock("@/features/comment/public/components", () => ({ default: () => null }));
vi.mock("@/app/(blog)/components/PageTitle", () => ({
  default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));
vi.mock("@/app/(blog)/components/RichText", () => ({
  RichText: ({ html }: { html?: string }) => <article>{html}</article>,
}));

import Pages from "./page";

describe("pages detail page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
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
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps server rendering read-only and reports the view after mounting", async () => {
    const element = await Pages({
      params: Promise.resolve({ id: "page-1", locale: "zh" }),
    });
    await act(async () => root.render(element));

    expect(container.textContent).toContain("页面正文");
    expect(mockServerIncrementViews).not.toHaveBeenCalled();
    expect(mockClientIncrementViews).toHaveBeenCalledOnce();
    expect(mockClientIncrementViews).toHaveBeenCalledWith(
      { id: "page-1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
