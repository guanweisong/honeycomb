import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PostListSkeleton } from "@/app/(blog)/components/features/post/public/components/PostList/Skeleton";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLocale = vi.fn();
const mockGetTranslations = vi.fn();
const mockSettingIndex = vi.fn();
const mockMenuIndex = vi.fn();
const mockTagIndex = vi.fn();
const mockUserDetail = vi.fn();
const mockPostIndex = vi.fn();

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
  getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
}));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/app/trpc/server", () => ({
  createServerClient: async () => ({
    menu: { index: mockMenuIndex },
    post: { index: mockPostIndex },
    setting: { index: mockSettingIndex },
    tag: { index: mockTagIndex },
    user: { detail: mockUserDetail },
  }),
}));
vi.mock(
  "@/app/(blog)/components/features/post/public/components/PostList",
  () => ({
    default: ({
      queryParams,
      initialData,
    }: {
      queryParams: Record<string, unknown>;
      initialData?: unknown;
    }) =>
      React.createElement(
        "output",
        {
          "data-testid": "post-list",
          "data-initial": JSON.stringify(initialData),
        },
        JSON.stringify(queryParams),
      ),
  }),
);

vi.mock("@/app/(blog)/[locale]/list/[...slug]/components/NoData", () => ({
  default: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "no-data" }, title),
}));

import List, {
  generateMetadata,
} from "@/app/(blog)/[locale]/list/[...slug]/page";
import { resolveListContext } from "@/app/(blog)/[locale]/list/[...slug]/page.utils";
import { createServerClient } from "@/app/trpc/server";
import { MenuType } from "@/features/menu/types/menu.type";
import { MultiLangEnum } from "@/lib/i18n/i18n";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
}));

function renderListContent(props: Parameters<typeof List>[0]) {
  const boundary = List(props);
  const content = boundary.props.children;
  return (
    content.type as (props: unknown) => Promise<React.ReactNode>
  )(content.props);
}

describe("blog list page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    mockGetLocale.mockReset().mockResolvedValue("zh");
    mockGetTranslations
      .mockReset()
      .mockResolvedValue((key: string, values?: Record<string, string>) => {
        if (key === "postUnderTag") return `标签：${values?.tag ?? ""}`;
        if (key === "postUnderAuthor") return `作者：${values?.author ?? ""}`;
        if (key === "emptyTip") return "暂无文章";
        return key;
      });
    mockSettingIndex.mockReset().mockResolvedValue({
      siteName: { zh: "蜂巢" },
      siteSubName: { zh: "记录值得分享的事" },
    });
    mockMenuIndex.mockReset().mockResolvedValue({
      list: [
        {
          id: "category-1",
          type: MenuType.CATEGORY,
          path: "tech",
          title: { zh: "技术" },
        },
        { id: "about", type: MenuType.PAGE, path: null, parent: null },
        { id: "external", type: MenuType.CUSTOM, path: null, parent: null },
      ],
    });
    mockTagIndex.mockReset().mockResolvedValue({
      list: [{ id: "111111111111111111111111", name: { zh: "标签名称" } }],
    });
    mockUserDetail.mockReset().mockResolvedValue({
      id: "222222222222222222222222",
      name: "作者名称",
    });
    mockPostIndex.mockReset().mockResolvedValue({
      list: [{ id: "post-1" }],
      total: 1,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("uses the article-list skeleton as the route loading fallback", async () => {
    const boundary = List({
      params: Promise.resolve({ locale: "zh", slug: ["category"] }),
      searchParams: Promise.resolve({}),
    });
    const fallback = boundary.props.fallback as React.ReactElement;
    const renderedFallback = await (
      fallback.type as () => Promise<React.ReactNode>
    )();

    expect(React.isValidElement(renderedFallback)).toBe(true);
    const skeleton = renderedFallback as React.ReactElement<{ label: string }>;
    expect(skeleton.type).toBe(PostListSkeleton);
    expect(skeleton.props.label).toBe("loading");
  });

  async function renderList(slug: string[]) {
    const element = await renderListContent({
      params: Promise.resolve({ locale: "zh", slug }),
      searchParams: Promise.resolve({}),
    });
    await act(async () => root.render(element));
  }

  function renderedQuery() {
    const output = container.querySelector('[data-testid="post-list"]');
    if (!output) throw new Error("Expected a rendered post list");
    return JSON.parse(output.textContent ?? "") as Record<string, unknown>;
  }

  describe.each(["tags", "authors"])("invalid %s route IDs", (type) => {
    describe.each(["content", "metadata"])("%s entry point", (entryPoint) => {
      it.each([undefined, "", "short", "x".repeat(25)])(
        "returns notFound before lookup for %s",
        async (id) => {
          const slug = id === undefined ? [type] : [type, id];
          const props = {
            params: Promise.resolve({ locale: "zh", slug }),
            searchParams: Promise.resolve({}),
          };
          const result =
            entryPoint === "content"
              ? renderListContent(props)
              : generateMetadata(props);
          await expect(result).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
          expect(mockTagIndex).not.toHaveBeenCalled();
          expect(mockUserDetail).not.toHaveBeenCalled();
          expect(mockPostIndex).not.toHaveBeenCalled();
        },
      );
    });
  });

  it.each(["content", "metadata"])(
    "starts independent %s work before settings resolve",
    async (entryPoint) => {
      let releaseSetting!: (value: object) => void;
      mockSettingIndex.mockReturnValue(
        new Promise((resolve) => {
          releaseSetting = resolve;
        }),
      );
      const props = {
        params: Promise.resolve({ locale: "zh", slug: ["category", "tech"] }),
        searchParams: Promise.resolve({}),
      };
      const pending =
        entryPoint === "metadata"
          ? generateMetadata(props)
          : renderListContent(props);
      for (let index = 0; index < 8; index++) await Promise.resolve();
      try {
        expect(mockGetTranslations).toHaveBeenCalled();
        if (entryPoint === "content")
          expect(mockPostIndex).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: "category-1" }),
          );
      } finally {
        releaseSetting({ siteName: { zh: "蜂巢" } });
        await pending;
      }
    },
  );

  describe.each(["content", "metadata"])(
    "%s route-specific dependencies",
    (entryPoint) => {
      it.each(["tags", "authors"])(
        "starts %s lookup without awaiting unrelated menu data",
        async (type) => {
          const menuDeferred = Promise.withResolvers<object>();
          mockMenuIndex.mockReturnValue(menuDeferred.promise);
          const requestedId = "aaaaaaaaaaaaaaaaaaaaaaaa";
          const matchedId = "bbbbbbbbbbbbbbbbbbbbbbbb";
          if (type === "tags")
            mockTagIndex.mockResolvedValue({
              list: [{ id: matchedId, name: { zh: "标签名称" } }],
              total: 1,
            });
          else
            mockUserDetail.mockResolvedValue({
              id: matchedId,
              name: "作者名称",
            });
          const props = {
            params: Promise.resolve({
              locale: "zh",
              slug: [type, requestedId],
            }),
            searchParams: Promise.resolve({}),
          };
          const pending =
            entryPoint === "metadata"
              ? generateMetadata(props)
              : renderListContent(props);
          for (let index = 0; index < 12; index++) await Promise.resolve();
          try {
            expect(
              type === "tags" ? mockTagIndex : mockUserDetail,
            ).toHaveBeenCalledWith(
              type === "tags"
                ? { limit: 1, page: 1, id: [requestedId] }
                : { id: requestedId },
            );
            expect(mockMenuIndex).not.toHaveBeenCalled();
            if (entryPoint === "content")
              expect(mockPostIndex).toHaveBeenCalledWith(
                expect.objectContaining(
                  type === "tags"
                    ? { tagId: matchedId }
                    : { authorId: matchedId },
                ),
              );
          } finally {
            menuDeferred.resolve({ list: [], total: 0 });
            await pending;
          }
        },
      );

      it("prepares the category root without fetching unrelated menu data", async () => {
        const menuDeferred = Promise.withResolvers<object>();
        mockMenuIndex.mockReturnValue(menuDeferred.promise);
        const props = {
          params: Promise.resolve({ locale: "zh", slug: ["category"] }),
          searchParams: Promise.resolve({}),
        };
        const pending =
          entryPoint === "metadata"
            ? generateMetadata(props)
            : renderListContent(props);
        for (let index = 0; index < 12; index++) await Promise.resolve();
        try {
          expect(mockMenuIndex).not.toHaveBeenCalled();
          if (entryPoint === "content") {
            expect(mockPostIndex).toHaveBeenCalledExactlyOnceWith({
              status: ["PUBLISHED"],
              limit: 10,
              sortField: "createdAt",
              cursor: null,
            });
          }
        } finally {
          menuDeferred.resolve({ list: [], total: 0 });
          await pending;
        }
      });

      it.each(["en", "zh"])(
        "loads translations for explicit route locale %s",
        async (locale) => {
          const props = {
            params: Promise.resolve({ locale, slug: ["category"] }),
            searchParams: Promise.resolve({}),
          };
          await (entryPoint === "metadata"
            ? generateMetadata(props)
            : renderListContent(props));
          expect(mockGetTranslations).toHaveBeenCalledExactlyOnceWith({
            locale,
            namespace: "PostList",
          });
          expect(mockGetLocale).not.toHaveBeenCalled();
        },
      );

      it("waits for category menu resolution before starting the category post query", async () => {
        const menuDeferred = Promise.withResolvers<object>();
        mockMenuIndex.mockReturnValue(menuDeferred.promise);
        const props = {
          params: Promise.resolve({ locale: "zh", slug: ["category", "tech"] }),
          searchParams: Promise.resolve({}),
        };
        const pending =
          entryPoint === "metadata"
            ? generateMetadata(props)
            : renderListContent(props);
        for (let index = 0; index < 12; index++) await Promise.resolve();
        expect(mockMenuIndex).toHaveBeenCalledOnce();
        expect(mockPostIndex).not.toHaveBeenCalled();
        menuDeferred.resolve({
          list: [{ id: "category-1", path: "tech", title: { zh: "技术" } }],
          total: 1,
        });
        await pending;
        if (entryPoint === "content")
          expect(mockPostIndex).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: "category-1" }),
          );
      });
    },
  );

  it("keeps the category root as the published-post index", async () => {
    await renderList(["category"]);
    expect(renderedQuery()).toEqual({
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
    });
  });

  it("passes the cached first page to the stable client query key", async () => {
    await renderList(["category"]);

    const initialData = container
      .querySelector('[data-testid="post-list"]')
      ?.getAttribute("data-initial");
    expect(JSON.parse(initialData ?? "null")).toEqual({
      list: [{ id: "post-1" }],
      total: 1,
    });
  });

  it("loads list cards from the cached route data", async () => {
    const props = {
      params: Promise.resolve({ locale: "zh", slug: ["category"] }),
      searchParams: Promise.resolve({}),
    };
    await renderListContent(props);
    expect(mockPostIndex).toHaveBeenCalledOnce();
    expect(mockPostIndex).toHaveBeenCalledWith({
      status: ["PUBLISHED"],
      limit: 10,
      sortField: "createdAt",
      cursor: null,
    });
  });

  it("resolves category paths to the category id used by the post query", async () => {
    await renderList(["category", "tech"]);

    expect(renderedQuery()).toEqual({
      categoryId: "category-1",
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
    });
    expect(container.textContent).not.toContain("技术_蜂巢");
  });

  it("resolves a stable legacy category path and redirects a previously parseable alias", async () => {
    mockMenuIndex.mockResolvedValue({
      list: [
        { id: "category-root", path: "old/path", title: { zh: "旧分类" } },
        {
          id: "category-child",
          parent: "category-root",
          path: "笔记",
          title: { zh: "笔记" },
        },
        { id: "category-alias", path: "old+alias", title: { zh: "旧别名" } },
      ],
    });
    await expect(
      resolveListContext(
        {
          locale: MultiLangEnum.Zh,
          slug: ["category", "~category-root", "笔记"],
        },
        await createServerClient(),
      ),
    ).resolves.toMatchObject({
      kind: "resolved",
      context: {
        queryParams: { categoryId: "category-child" },
        typeName: "笔记",
      },
    });
    await expect(
      resolveListContext(
        {
          locale: MultiLangEnum.Zh,
          slug: ["category", "old+alias"],
        },
        await createServerClient(),
      ),
    ).resolves.toMatchObject({
      kind: "redirect",
      href: "/zh/list/category/~category-alias",
    });
  });

  it("uses the resolved tag id and localized tag heading", async () => {
    await renderList(["tags", "111111111111111111111111"]);

    expect(renderedQuery()).toEqual({
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
      tagId: "111111111111111111111111",
    });
    expect(container.textContent).toContain("标签：标签名称");
  });

  it("keeps the localized empty state for an existing tag", async () => {
    mockPostIndex.mockResolvedValue({ list: [], total: 0 });

    await renderList(["tags", "111111111111111111111111"]);

    expect(container.textContent).toContain("标签：标签名称");
    expect(
      container.querySelector('[data-testid="no-data"]')?.textContent,
    ).toBe("暂无文章");
  });

  it("uses the resolved author id and author heading", async () => {
    await renderList(["authors", "222222222222222222222222"]);

    expect(renderedQuery()).toEqual({
      authorId: "222222222222222222222222",
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
    });
    expect(container.textContent).toContain("作者：作者名称");
  });

  describe.each(["content", "metadata"])(
    "%s route validation",
    (entryPoint) => {
      it.each([
        ["tags", mockTagIndex, { list: [] }],
        ["authors", mockUserDetail, null],
      ] as const)(
        "rejects missing %s before querying posts or emitting canonical",
        async (type, query, missing) => {
          query.mockResolvedValue(missing);
          const props = {
            params: Promise.resolve({
              locale: "zh",
              slug: [type, "f".repeat(24)],
            }),
            searchParams: Promise.resolve({}),
          };
          const pending =
            entryPoint === "metadata"
              ? generateMetadata(props)
              : renderListContent(props);
          await expect(pending).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
          expect(mockPostIndex).not.toHaveBeenCalled();
        },
      );

      it.each(
        [
          [],
          ["unknown"],
          ["category", "missing"],
          ["category", "about"],
          ["category", "external"],
          ["category", "wrong-ancestor", "tech"],
          ["category", "", "tech"],
          ["tags", "extra", "111111111111111111111111"],
          ["authors", "extra", "222222222222222222222222"],
        ].map((slug) => ({ slug })),
      )(
        "rejects invalid path $slug before returning content or canonical",
        async ({ slug }) => {
          const props = {
            params: Promise.resolve({ locale: "zh", slug }),
            searchParams: Promise.resolve({}),
          };
          const pending =
            entryPoint === "metadata"
              ? generateMetadata(props)
              : renderListContent(props);
          await expect(pending).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
          expect(mockPostIndex).not.toHaveBeenCalled();
          expect(mockTagIndex).not.toHaveBeenCalled();
          expect(mockUserDetail).not.toHaveBeenCalled();
        },
      );

      it.each(
        [MenuType.PAGE, MenuType.CUSTOM].flatMap((parentType) =>
          [false, true].map((nested) => ({ parentType, nested })),
        ),
      )(
        "preserves category URLs through null-path $parentType ancestors (nested=$nested)",
        async ({ parentType, nested }) => {
          mockPostIndex.mockClear();
          mockMenuIndex.mockResolvedValue({
            list: [
              ...(nested
                ? [
                    {
                      id: "root",
                      parent: null,
                      type: MenuType.CATEGORY,
                      path: "topics",
                    },
                  ]
                : []),
              {
                id: "bridge",
                parent: nested ? "root" : null,
                type: parentType,
                path: null,
              },
              {
                id: "category-1",
                parent: "bridge",
                type: MenuType.CATEGORY,
                path: "tech",
                title: { zh: "技术" },
              },
            ],
            total: nested ? 3 : 2,
          });
          const slug = nested
            ? ["category", "topics", "tech"]
            : ["category", "tech"];
          const props = {
            params: Promise.resolve({ locale: "zh", slug }),
            searchParams: Promise.resolve({}),
          };
          const result = await (entryPoint === "metadata"
            ? generateMetadata(props)
            : renderListContent(props));
          if (entryPoint === "metadata")
            expect(result).toMatchObject({
              alternates: {
                canonical: nested
                  ? "/zh/list/category/topics/tech"
                  : "/zh/list/category/tech",
              },
            });
          else
            expect(mockPostIndex).toHaveBeenCalledWith(
              expect.objectContaining({ categoryId: "category-1" }),
            );
        },
      );

      it("requires the complete category ancestry and preserves a valid canonical", async () => {
        mockMenuIndex.mockResolvedValue({
          list: [
            {
              id: "parent",
              parent: null,
              path: "topics",
              title: { zh: "主题" },
            },
            {
              id: "category-1",
              parent: "parent",
              path: "tech",
              title: { zh: "技术" },
            },
          ],
          total: 2,
        });
        const props = (slug: string[]) => ({
          params: Promise.resolve({ locale: "zh", slug }),
          searchParams: Promise.resolve({}),
        });
        const run = (slug: string[]) => {
          const input = props(slug);
          return entryPoint === "metadata"
            ? generateMetadata(input)
            : renderListContent(input);
        };
        await expect(run(["category", "tech"])).rejects.toThrow(
          "NEXT_HTTP_ERROR_FALLBACK;404",
        );
        const result = await run(["category", "topics", "tech"]);
        if (entryPoint === "metadata")
          expect(result).toMatchObject({
            alternates: { canonical: "/zh/list/category/topics/tech" },
          });
        else
          expect(mockPostIndex).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: "category-1" }),
          );
      });
    },
  );

  it.each([
    [
      ["category", "tech"],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "技术_蜂巢",
          type: "website",
        },
        title: "技术_蜂巢",
      },
    ],
    [
      ["tags", "111111111111111111111111"],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "标签：标签名称",
          type: "website",
        },
        title: "标签：标签名称",
      },
    ],
    [
      ["authors", "222222222222222222222222"],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "作者：作者名称",
          type: "website",
        },
        title: "作者：作者名称",
      },
    ],
    [
      ["category"],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "蜂巢",
          type: "website",
        },
        title: "蜂巢",
      },
    ],
  ] as const)("generates localized metadata for %j", async (slug, expected) => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: [...slug], locale: "zh" }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toMatchObject(expected);
  });
});
