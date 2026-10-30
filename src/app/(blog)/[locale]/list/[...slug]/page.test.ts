import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

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
const mockPublicPostList = vi.fn();
const mockPublicTag = vi.fn();
const mockPublicAuthor = vi.fn();

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
  getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
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
vi.mock("@/app/lib/server/public-queries", () => ({
  getPublicMenu: () => mockMenuIndex(),
  getPublicPostList: (...args: unknown[]) => mockPublicPostList(...args),
  getPublicSetting: () => mockSettingIndex(),
  getPublicTag: (...args: unknown[]) => mockPublicTag(...args),
  getPublicAuthor: (...args: unknown[]) => mockPublicAuthor(...args),
}));

vi.mock("@/app/(blog)/components/features/post/public/components/PostList", () => ({
  default: ({ queryParams }: { queryParams: Record<string, unknown> }) =>
    React.createElement(
      "output",
      { "data-testid": "post-list" },
      JSON.stringify(queryParams),
    ),
}));

vi.mock("@/app/(blog)/[locale]/list/[...slug]/components/NoData", () => ({
  default: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "no-data" }, title),
}));

import List, {
  generateMetadata,
} from "@/app/(blog)/[locale]/list/[...slug]/page";
import { resolveListContext } from "@/app/(blog)/[locale]/list/[...slug]/page.utils";
import { IdSchema } from "@/lib/validation/id.schema";
import { TagListQuerySchema } from "@/features/tag/schemas/tag.list.schema";
import { MenuType } from "@/features/menu/types/menu.type";
import { MultiLangEnum } from "@/lib/i18n/i18n";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
}));

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
    mockPublicTag.mockReset().mockImplementation(async (id: string) => {
      const input = TagListQuerySchema.parse({ limit: 1, page: 1, id: [id] });
      return (await mockTagIndex(input)).list[0];
    });
    mockUserDetail.mockReset().mockResolvedValue({
      id: "222222222222222222222222",
      name: "作者名称",
    });
    mockPublicAuthor.mockReset().mockImplementation((id: string) => {
      IdSchema.parse(id);
      return mockUserDetail({ id });
    });
    mockPostIndex.mockReset().mockResolvedValue({
      list: [{ id: "post-1" }],
      total: 1,
    });
    mockPublicPostList
      .mockReset()
      .mockImplementation((input) => mockPostIndex(input));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderList(slug: string[]) {
    const element = await List({
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
          const result =
            entryPoint === "content"
              ? resolveListContext({
                  locale: MultiLangEnum.Zh,
                  slug,
                })
              : generateMetadata({
                  params: Promise.resolve({ locale: "zh", slug }),
                  searchParams: Promise.resolve({}),
                });
          await expect(result).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
          expect(mockPublicTag).not.toHaveBeenCalled();
          expect(mockPublicAuthor).not.toHaveBeenCalled();
          expect(mockPublicPostList).not.toHaveBeenCalled();
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
      const content = List(props).props.children[1].props.children;
      const pending =
        entryPoint === "metadata"
          ? generateMetadata(props)
          : content.type(content.props);
      for (let index = 0; index < 8; index++) await Promise.resolve();
      try {
        expect(mockGetTranslations).toHaveBeenCalled();
        if (entryPoint === "content")
          expect(mockPublicPostList).toHaveBeenCalledWith(
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
            mockPublicTag.mockResolvedValue({
              id: matchedId,
              name: { zh: "标签名称" },
            });
          else
            mockPublicAuthor.mockResolvedValue({
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
          const content = List(props).props.children[1].props.children;
          const pending =
            entryPoint === "metadata"
              ? generateMetadata(props)
              : content.type(content.props);
          for (let index = 0; index < 12; index++) await Promise.resolve();
          try {
            expect(
              type === "tags" ? mockPublicTag : mockPublicAuthor,
            ).toHaveBeenCalledWith(requestedId);
            expect(mockMenuIndex).not.toHaveBeenCalled();
            if (entryPoint === "content")
              expect(mockPublicPostList).toHaveBeenCalledWith(
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
        const content = List(props).props.children[1].props.children;
        const pending =
          entryPoint === "metadata"
            ? generateMetadata(props)
            : content.type(content.props);
        for (let index = 0; index < 12; index++) await Promise.resolve();
        try {
          expect(mockMenuIndex).not.toHaveBeenCalled();
          if (entryPoint === "content") {
            expect(mockPublicPostList).toHaveBeenCalledExactlyOnceWith({
              status: ["PUBLISHED"],
              limit: 10,
              sortField: "createdAt",
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
          const content = List(props).props.children[1].props.children;
          await (entryPoint === "metadata"
            ? generateMetadata(props)
            : content.type(content.props));
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
        const content = List(props).props.children[1].props.children;
        const pending =
          entryPoint === "metadata"
            ? generateMetadata(props)
            : content.type(content.props);
        for (let index = 0; index < 12; index++) await Promise.resolve();
        expect(mockMenuIndex).toHaveBeenCalledOnce();
        expect(mockPublicPostList).not.toHaveBeenCalled();
        menuDeferred.resolve({
          list: [{ id: "category-1", path: "tech", title: { zh: "技术" } }],
          total: 1,
        });
        await pending;
        if (entryPoint === "content")
          expect(mockPublicPostList).toHaveBeenCalledWith(
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

  it("keeps an unknown tag id and renders the localized empty state", async () => {
    mockTagIndex.mockResolvedValue({ list: [] });
    mockPostIndex.mockResolvedValue({ list: [], total: 0 });

    await renderList(["tags", "ffffffffffffffffffffffff"]);

    expect(container.textContent).toContain("标签：");
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

  it("keeps an unknown author id without inventing an author name", async () => {
    mockUserDetail.mockResolvedValue(null);

    await renderList(["authors", "eeeeeeeeeeeeeeeeeeeeeeee"]);

    expect(renderedQuery()).toMatchObject({
      authorId: "eeeeeeeeeeeeeeeeeeeeeeee",
    });
    expect(container.textContent).toContain("作者：");
  });

  describe.each(["content", "metadata"])(
    "%s route validation",
    (entryPoint) => {
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
          const content = List(props).props.children[1].props.children;
          const pending =
            entryPoint === "metadata"
              ? generateMetadata(props)
              : content.type(content.props);
          await expect(pending).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
          expect(mockPublicPostList).not.toHaveBeenCalled();
          expect(mockPublicTag).not.toHaveBeenCalled();
          expect(mockPublicAuthor).not.toHaveBeenCalled();
        },
      );

      it.each(
        [MenuType.PAGE, MenuType.CUSTOM].flatMap((parentType) =>
          [false, true].map((nested) => ({ parentType, nested })),
        ),
      )(
        "preserves category URLs through null-path $parentType ancestors (nested=$nested)",
        async ({ parentType, nested }) => {
          mockPublicPostList.mockClear();
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
          const content = List(props).props.children[1].props.children;
          const result = await (entryPoint === "metadata"
            ? generateMetadata(props)
            : content.type(content.props));
          if (entryPoint === "metadata")
            expect(result).toMatchObject({
              alternates: {
                canonical: nested
                  ? "/zh/list/category/topics/tech"
                  : "/zh/list/category/tech",
              },
            });
          else
            expect(mockPublicPostList).toHaveBeenCalledWith(
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
          const content = List(input).props.children[1].props.children;
          return entryPoint === "metadata"
            ? generateMetadata(input)
            : content.type(content.props);
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
          expect(mockPublicPostList).toHaveBeenCalledWith(
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

  it("uses an empty name when metadata cannot resolve a tag", async () => {
    mockTagIndex.mockResolvedValue({ list: [] });

    const metadata = await generateMetadata({
      params: Promise.resolve({
        slug: ["tags", "ffffffffffffffffffffffff"],
        locale: "zh",
      }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe("标签：");
  });
});
