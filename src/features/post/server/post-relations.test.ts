import { PostWithRelationsSchema } from "@/features/post/schemas/post.read-model.schema";
import type { PostWithRelations } from "@/features/post/types/post.read-model";
import { TagType } from "@/features/tag/types/tag.type";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";
import { EnableStatus } from "@/lib/validation/enable-status";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it, vi } from "vitest";
import { loadPostRelations } from "./post-relations";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: vi.fn((_name, _operation, callback) => callback()),
}));

describe("loadPostRelations", () => {
  it("returns no rows without querying for an empty post list", async () => {
    const db = { query: { post: { findMany: vi.fn() } } };

    await expect(loadPostRelations(asMockDatabase(db), [])).resolves.toEqual(
      [],
    );
    expect(db.query.post.findMany).not.toHaveBeenCalled();
  });

  it("preserves post order and maps typed tags while omitting missing relations", async () => {
    const first = createPostFixture({
      id: "post-1",
      title: { zh: "first", en: "first" },
    });
    const second = createPostFixture({
      id: "post-2",
      title: { zh: "second", en: "second" },
    });
    const actor = {
      id: "tag-actor",
      name: { zh: "Actor", en: "Actor" },
      createdAt: null,
      updatedAt: null,
    };
    const gallery = {
      id: "tag-gallery",
      name: { zh: "Gallery", en: "Gallery" },
      createdAt: null,
      updatedAt: null,
    };
    const category = {
      id: "category-1",
      title: null,
      description: null,
      parent: null,
      status: EnableStatus.ENABLE,
      path: "category",
      createdAt: null,
      updatedAt: null,
    } satisfies NonNullable<PostWithRelations["category"]>;
    const author = {
      id: "user-1",
      name: "Author",
    } satisfies NonNullable<PostWithRelations["author"]>;
    const cover = {
      id: "media-1",
      key: "cover.png",
      name: "cover.png",
      size: 10,
      type: "image/png",
      url: "https://assets.test/cover.png",
      color: null,
      width: null,
      height: null,
      createdAt: null,
      updatedAt: null,
    } satisfies NonNullable<PostWithRelations["cover"]>;
    const db = {
      query: {
        post: {
          findMany: vi.fn().mockResolvedValue([
            {
              ...first,
              translations: [
                {
                  postId: first.id,
                  locale: "en",
                  title: "first",
                  content: null,
                  excerpt: null,
                  galleryLocation: null,
                  quoteAuthor: null,
                  quoteContent: null,
                },
                {
                  postId: first.id,
                  locale: "zh",
                  title: "first",
                  content: null,
                  excerpt: null,
                  galleryLocation: null,
                  quoteAuthor: null,
                  quoteContent: null,
                },
              ],
              category: { ...category, translations: [] },
              author,
              cover,
              postTags: [
                {
                  type: TagType.ACTOR,
                  tag: {
                    ...actor,
                    translations: [
                      { tagId: actor.id, locale: "en", name: "Actor" },
                      { tagId: actor.id, locale: "zh", name: "Actor" },
                    ],
                  },
                },
                {
                  type: TagType.GALLERY_STYLE,
                  tag: {
                    ...gallery,
                    translations: [
                      { tagId: gallery.id, locale: "en", name: "Gallery" },
                      { tagId: gallery.id, locale: "zh", name: "Gallery" },
                    ],
                  },
                },
                { type: TagType.DIRECTOR, tag: null },
              ],
            },
          ]),
        },
      },
    };

    await expect(
      loadPostRelations(asMockDatabase(db), [
        { id: second.id },
        { id: first.id },
      ]),
    ).resolves.toEqual([
      {
        ...PostWithRelationsSchema.parse(first),
        category,
        author,
        cover,
        movieActors: [actor],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [gallery],
      },
    ]);
    expect(db.query.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        with: expect.objectContaining({
          author: { columns: { id: true, name: true } },
        }),
      }),
    );
  });
});

describe("post snapshot privacy", () => {
  it.each(["ALL", "PUBLISHED_ONLY"] as const)(
    "uses the newer complete %s relation snapshot and strips private columns",
    async (visibility) => {
      const older = createPostFixture({ version: 2, movieTime: "old" });
      const latest = {
        ...older,
        version: 3,
        movieTime: "new",
        creationToken: "private-token",
        creationInputHash: "private-hash",
        translations: [],
        category: null,
        author: null,
        cover: null,
        postTags: [],
      };
      const db = {
        query: { post: { findMany: vi.fn().mockResolvedValue([latest]) } },
      };
      const [result] = await loadPostRelations(
        asMockDatabase(db),
        [{ id: older.id }],
        visibility,
      );
      expect(result).toMatchObject({ version: 3, movieTime: "new" });
      expect(result).not.toHaveProperty("creationToken");
      expect(result).not.toHaveProperty("creationInputHash");
    },
  );
  it.each(["ALL", "PUBLISHED_ONLY"] as const)(
    "does not resurrect a deleted %s snapshot",
    async (visibility) => {
      const db = {
        query: { post: { findMany: vi.fn().mockResolvedValue([]) } },
      };
      expect(
        await loadPostRelations(
          asMockDatabase(db),
          [{ id: "deleted-post" }],
          visibility,
        ),
      ).toEqual([]);
    },
  );
});

describe("required persistence results", () => {
  function authorize(db: ReturnType<typeof createMockDb>) {
    db.from.mockImplementation((table: object) => {
      if (table === schema.user) {
        const actor = createMockDb();
        actor.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        return Object.assign(Promise.resolve([]), actor);
      }
      if (
        table === schema.postTranslation ||
        table === schema.settingTranslation ||
        table === schema.pageTranslation
      ) {
        const read = createMockDb();
        read.where.mockResolvedValue([]);
        return read;
      }
      return db;
    });
  }
  it.each(["status", "type", "commentStatus"])(
    "rejects an unknown post %s during DTO mapping",
    async (field) => {
      const row: typeof schema.post.$inferSelect = {
        id: "post",
        version: 0,
        creationToken: null,
        creationInputHash: null,
        authorId: "author",
        categoryId: "category",
        status: "PUBLISHED",
        type: "ARTICLE",
        commentStatus: "ENABLE",
        coverId: null,
        movieTime: null,
        galleryTime: null,
        views: 0,
        createdAt: null,
        updatedAt: null,
      };
      const db = createMockDb();
      authorize(db);
      db.query.post.findMany.mockResolvedValue([
        {
          ...row,
          [field]: "UNKNOWN",
          author: null,
          cover: null,
          category: null,
          translations: [],
          postTags: [],
        },
      ]);
      await expect(
        loadPostRelations(asMockDatabase(db), [{ ...row, [field]: "UNKNOWN" }]),
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    },
  );
});
