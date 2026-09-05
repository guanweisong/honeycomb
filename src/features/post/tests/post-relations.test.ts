import { describe, expect, it, vi } from "vitest";
import { TagType } from "@/packages/domain/content/tag";
import { loadPostRelations } from "../post-relations";
import { asMockDatabase } from "@tests/helpers/test-utils";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import type { PostWithRelations } from "../application/repository";

vi.mock("@/packages/infrastructure/observability/server", () => ({
  observeDbOperation: vi.fn((_name, _operation, callback) => callback()),
}));

describe("loadPostRelations", () => {
  it("returns no rows without querying for an empty post list", async () => {
    const db = { query: { post: { findMany: vi.fn() } } };

    await expect(loadPostRelations(asMockDatabase(db), [])).resolves.toEqual([]);
    expect(db.query.post.findMany).not.toHaveBeenCalled();
  });

  it("preserves post order and maps typed tags while omitting missing relations", async () => {
    const first = createPostFixture({ id: "post-1", title: { zh: "first", en: "first" } });
    const second = createPostFixture({ id: "post-2", title: { zh: "second", en: "second" } });
    const actor = { id: "tag-actor", name: { zh: "Actor", en: "Actor" }, createdAt: null, updatedAt: null };
    const gallery = { id: "tag-gallery", name: { zh: "Gallery", en: "Gallery" }, createdAt: null, updatedAt: null };
    const category = {
      id: "category-1", title: null, description: null, parent: null,
      status: "ENABLE", path: "category", createdAt: null, updatedAt: null,
    } satisfies NonNullable<PostWithRelations["category"]>;
    const author = {
      id: "user-1", email: "author@example.com", name: "Author",
      level: "GUEST", status: "ACTIVE", createdAt: null, updatedAt: null,
    } satisfies NonNullable<PostWithRelations["author"]>;
    const cover = {
      id: "media-1", key: "cover.png", name: "cover.png", size: 10,
      type: "image/png", url: "https://assets.test/cover.png",
      color: null, width: null, height: null, createdAt: null, updatedAt: null,
    } satisfies NonNullable<PostWithRelations["cover"]>;
    const db = {
      query: {
        post: {
          findMany: vi.fn().mockResolvedValue([
            {
              ...first,
              category,
              author,
              cover,
              postTags: [
                { type: TagType.ACTOR, tag: actor },
                { type: TagType.GALLERY_STYLE, tag: gallery },
                { type: TagType.DIRECTOR, tag: null },
              ],
            },
          ]),
        },
      },
    };

    await expect(
      loadPostRelations(asMockDatabase(db), [second, first]),
    ).resolves.toEqual([
      {
        ...second,
        movieActors: [],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [],
      },
      {
        ...first,
        category,
        author,
        cover,
        movieActors: [actor],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [gallery],
      },
    ]);
  });
});
