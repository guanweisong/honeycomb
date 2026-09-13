import { sql } from "drizzle-orm";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import * as schema from "@/packages/infrastructure/db/schema";
import * as tools from "@/packages/infrastructure/db/query/tools";
import * as relations from "@/features/post/infrastructure/post-query-repository";
import { createPostQueryRepository } from "@/features/post/infrastructure/post-query-repository";
import type { PostQueryRepository } from "@/features/post/application/repository";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  asMockDatabase,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

const mockDb = createMockDb();

let buildCategoryFilterMock: MockInstance<
  PostQueryRepository["categoryFilter"]
>;
let loadPostRelationsMock: MockInstance<typeof relations.loadPostRelations>;
let repository: ReturnType<typeof createPostQueryRepository>;

describe("文章查询 Repository", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetMockDb(mockDb);

    vi.spyOn(tools, "buildDrizzleWhere").mockReturnValue(undefined);
    vi.spyOn(tools, "buildDrizzleOrderBy").mockReturnValue(
      sql`created_at desc`,
    );
    const categoryFilter = vi.fn<PostQueryRepository["categoryFilter"]>();
    buildCategoryFilterMock = categoryFilter;
    buildCategoryFilterMock.mockResolvedValue([]);
    loadPostRelationsMock = vi.spyOn(relations, "loadPostRelations");
    loadPostRelationsMock.mockImplementation(async (_db, posts) =>
      posts.map((post) => ({
        title: null,
        content: null,
        excerpt: null,
        galleryLocation: null,
        quoteAuthor: null,
        quoteContent: null,
        ...post,
        status: PostStatus.PUBLISHED,
        type: PostType.ARTICLE,
        commentStatus: EnableStatus.ENABLE,
        author: { id: post.authorId, name: "Author" },
        category: {
          id: post.categoryId,
          title: { en: "Category", zh: "分类" },
          description: null,
          parent: null,
          status: EnableStatus.ENABLE,
          path: "category",
          createdAt: null,
          updatedAt: null,
        },
        cover: undefined,
        movieActors: [],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [],
      })),
    );
    repository = createPostQueryRepository(asMockDatabase(mockDb), {
      loadRelations: relations.loadPostRelations,
    });
    repository.categoryFilter = categoryFilter;
  });

  it("returns a paginated list and total count", async () => {
    const posts = [
      createPostFixture({
        id: TEST_IDS.ID_1,
        title: { en: "Post 1", zh: "文章1" },
        content: { en: "Content 1", zh: "内容1" },
        categoryId: TEST_IDS.ID_2,
        authorId: TEST_IDS.ID_3,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
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
      repository.list(
        {
          page: 2,
          limit: 5,
          sortField: "createdAt",
          sortOrder: "desc",
        },
        "PUBLISHED_ONLY",
      ),
    ).resolves.toEqual({
      list: [
        {
          ...posts[0],
          author: { id: TEST_IDS.ID_3, name: "Author" },
          category: {
            id: TEST_IDS.ID_2,
            title: { en: "Category", zh: "分类" },
            description: null,
            parent: null,
            status: EnableStatus.ENABLE,
            path: "category",
            createdAt: null,
            updatedAt: null,
          },
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
      createPostFixture({
        id: TEST_IDS.ID_4,
        title: { en: "Category Post", zh: "分类文章" },
        content: { en: "Category Content", zh: "分类内容" },
        categoryId: TEST_IDS.ID_4,
        authorId: TEST_IDS.ID_5,
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
    ];

    buildCategoryFilterMock.mockResolvedValueOnce([
      TEST_IDS.ID_2,
      TEST_IDS.ID_4,
    ]);

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.orderBy.mockReturnValueOnce(mockDb);
    mockDb.limit.mockReturnValueOnce(mockDb);
    mockDb.offset.mockResolvedValueOnce(posts);

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([{ count: "1" }]);

    const result = await repository.list(
      {
        page: 1,
        limit: 10,
        categoryId: TEST_IDS.ID_2,
      },
      "PUBLISHED_ONLY",
    );

    expect(result.total).toBe(1);
    expect(buildCategoryFilterMock).toHaveBeenCalledWith(TEST_IDS.ID_2);
    expect(loadPostRelationsMock).toHaveBeenCalledWith(mockDb, posts);
  });

  it("returns empty result when tag filter matches no posts", async () => {
    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockResolvedValueOnce([]);

    const result = await repository.list(
      {
        page: 1,
        limit: 10,
        tagId: TEST_IDS.ID_4,
      },
      "PUBLISHED_ONLY",
    );

    expect(result).toEqual({ list: [], total: 0 });
    expect(mockDb.orderBy).not.toHaveBeenCalled();
    expect(loadPostRelationsMock).not.toHaveBeenCalled();
  });

  it("applies author filter and returns mapped posts", async () => {
    const posts = [
      createPostFixture({
        id: TEST_IDS.ID_3,
        title: { en: "Author Post", zh: "作者文章" },
        content: { en: "Author Content", zh: "作者内容" },
        categoryId: TEST_IDS.ID_1,
        authorId: TEST_IDS.ID_2,
        createdAt: "2026-01-03T00:00:00.000Z",
      }),
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

    const result = await repository.list(
      {
        page: 1,
        limit: 10,
        authorId: TEST_IDS.ID_2,
      },
      "PUBLISHED_ONLY",
    );

    expect(result).toEqual({
      list: [
        {
          ...posts[0],
          author: { id: TEST_IDS.ID_2, name: "Author" },
          category: {
            id: TEST_IDS.ID_1,
            title: { en: "Category", zh: "分类" },
            description: null,
            parent: null,
            status: EnableStatus.ENABLE,
            path: "category",
            createdAt: null,
            updatedAt: null,
          },
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
