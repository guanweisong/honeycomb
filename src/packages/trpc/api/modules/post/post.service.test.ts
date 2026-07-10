import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/packages/db/schema";
import * as tools from "@/packages/trpc/api/utils/tools";
import * as filters from "./utils/filters";
import * as relations from "./utils/relations";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockDb, resetMockDb } from "../../../../../../tests/helpers/test-utils";

const mockDb = createMockDb();

let getPostList: typeof import("./post.service").getPostList;
let buildCategoryFilterMock: {
  mockResolvedValue: (value: Awaited<ReturnType<typeof filters.buildCategoryFilter>>) => void;
  mockResolvedValueOnce: (value: Awaited<ReturnType<typeof filters.buildCategoryFilter>>) => void;
};
let loadPostRelationsMock: {
  mockImplementation: (
    impl: typeof relations.loadPostRelations,
  ) => void;
};

describe("getPostList", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetMockDb(mockDb);

    vi.spyOn(tools, "buildDrizzleWhere").mockReturnValue(undefined);
    vi.spyOn(tools, "buildDrizzleOrderBy").mockReturnValue({ kind: "order-by" } as never);
    buildCategoryFilterMock = vi.spyOn(filters, "buildCategoryFilter");
    buildCategoryFilterMock.mockResolvedValue([]);
    loadPostRelationsMock = vi.spyOn(relations, "loadPostRelations");
    loadPostRelationsMock.mockImplementation(async (_db: unknown, posts: Array<Record<string, unknown>>) =>
      posts.map((post) => ({
        ...post,
        author: { id: post.authorId, name: "Author" },
        category: { id: post.categoryId, title: { en: "Category", zh: "分类" } },
        cover: undefined,
        movieActors: [],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [],
      })) as never,
    );

    ({ getPostList } = await import("./post.service"));
  });

  it("returns a paginated list and total count", async () => {
    const posts = [
      {
        id: TEST_IDS.ID_1,
        title: { en: "Post 1", zh: "文章1" },
        content: { en: "Content 1", zh: "内容1" },
        categoryId: TEST_IDS.ID_2,
        authorId: TEST_IDS.ID_3,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.orderBy.mockReturnValueOnce(mockDb);
    mockDb.limit.mockReturnValueOnce(mockDb);
    mockDb.offset.mockResolvedValueOnce(posts);

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([{ count: "1" }]);

    await expect(
      getPostList(mockDb as never, {
        page: 2,
        limit: 5,
        sortField: "createdAt",
        sortOrder: "desc",
      } as never),
    ).resolves.toEqual({
      list: [
        {
          ...posts[0],
          author: { id: TEST_IDS.ID_3, name: "Author" },
          category: { id: TEST_IDS.ID_2, title: { en: "Category", zh: "分类" } },
          cover: undefined,
          movieActors: [],
          movieDirectors: [],
          movieStyles: [],
          galleryStyles: [],
        },
      ],
      total: 1,
    });

    expect(tools.buildDrizzleWhere).toHaveBeenCalledWith(
      schema.post,
      { title: undefined, content: undefined },
      ["status", "type"],
      { title: undefined, content: undefined },
    );
    expect(tools.buildDrizzleOrderBy).toHaveBeenCalledWith(
      schema.post,
      "createdAt",
      "desc",
      "createdAt",
    );
    expect(loadPostRelationsMock).toHaveBeenCalledWith(mockDb, posts);
  });

  it("applies category filter before querying posts", async () => {
    const posts = [
      {
        id: TEST_IDS.ID_4,
        title: { en: "Category Post", zh: "分类文章" },
        content: { en: "Category Content", zh: "分类内容" },
        categoryId: TEST_IDS.ID_4,
        authorId: TEST_IDS.ID_5,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ];

    buildCategoryFilterMock.mockResolvedValueOnce([TEST_IDS.ID_2, TEST_IDS.ID_4]);

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.orderBy.mockReturnValueOnce(mockDb);
    mockDb.limit.mockReturnValueOnce(mockDb);
    mockDb.offset.mockResolvedValueOnce(posts);

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([{ count: "1" }]);

    const result = await getPostList(mockDb as never, {
      page: 1,
      limit: 10,
      categoryId: TEST_IDS.ID_2,
    } as never);

    expect(result.total).toBe(1);
    expect(buildCategoryFilterMock).toHaveBeenCalledWith(mockDb, TEST_IDS.ID_2);
    expect(loadPostRelationsMock).toHaveBeenCalledWith(mockDb, posts);
  });

  it("returns empty result when tag filter matches no posts", async () => {
    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([]);

    const result = await getPostList(mockDb as never, {
      page: 1,
      limit: 10,
      tagId: TEST_IDS.ID_4,
    } as never);

    expect(result).toEqual({ list: [], total: 0 });
    expect(mockDb.orderBy).not.toHaveBeenCalled();
    expect(loadPostRelationsMock).not.toHaveBeenCalled();
  });

  it("applies author filter and returns mapped posts", async () => {
    const posts = [
      {
        id: TEST_IDS.ID_3,
        title: { en: "Author Post", zh: "作者文章" },
        content: { en: "Author Content", zh: "作者内容" },
        categoryId: TEST_IDS.ID_1,
        authorId: TEST_IDS.ID_2,
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ];

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.orderBy.mockReturnValueOnce(mockDb);
    mockDb.limit.mockReturnValueOnce(mockDb);
    mockDb.offset.mockResolvedValueOnce(posts);

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([{ count: "1" }]);

    const result = await getPostList(mockDb as never, {
      page: 1,
      limit: 10,
      authorId: TEST_IDS.ID_2,
    } as never);

    expect(result).toEqual({
      list: [
        {
          ...posts[0],
          author: { id: TEST_IDS.ID_2, name: "Author" },
          category: { id: TEST_IDS.ID_1, title: { en: "Category", zh: "分类" } },
          cover: undefined,
          movieActors: [],
          movieDirectors: [],
          movieStyles: [],
          galleryStyles: [],
        },
      ],
      total: 1,
    });
    expect(loadPostRelationsMock).toHaveBeenCalledWith(mockDb, posts);
  });
});
