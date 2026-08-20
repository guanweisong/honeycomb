import { describe, expect, it, vi } from "vitest";
import { TagType } from "@/packages/domain/content/tag";
import { loadPostRelations } from "../post-relations";

vi.mock("@/packages/infrastructure/observability/server", () => ({
  observeDbOperation: vi.fn((_name, _operation, callback) => callback()),
}));

describe("loadPostRelations", () => {
  it("returns no rows without querying for an empty post list", async () => {
    const db = { query: { post: { findMany: vi.fn() } } };

    await expect(loadPostRelations(db as never, [])).resolves.toEqual([]);
    expect(db.query.post.findMany).not.toHaveBeenCalled();
  });

  it("preserves post order and maps typed tags while omitting missing relations", async () => {
    const first = { id: "post-1", title: "first" };
    const second = { id: "post-2", title: "second" };
    const actor = { id: "tag-actor", name: "Actor" };
    const gallery = { id: "tag-gallery", name: "Gallery" };
    const db = {
      query: {
        post: {
          findMany: vi.fn().mockResolvedValue([
            {
              ...first,
              category: { id: "category-1" },
              author: { id: "user-1", email: "author@example.com" },
              cover: { id: "media-1" },
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
      loadPostRelations(db as never, [second, first] as never),
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
        category: { id: "category-1" },
        author: { id: "user-1", email: "author@example.com" },
        cover: { id: "media-1" },
        movieActors: [actor],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [gallery],
      },
    ]);
  });
});
