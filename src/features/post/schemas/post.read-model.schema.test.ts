import { describe, expect, it } from "vitest";
import { PostListResultSchema } from "@/features/post/schemas/post.read-model.schema";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import { EnableStatus } from "@/lib/validation/enable-status";

describe("共享契约的真实消费者", () => {
  it("缓存序列化往返不丢失可选关联、空值和媒体字段", () => {
    const tag = {
      id: "tag",
      name: { en: "Tag", zh: "标签" },
      createdAt: null,
      updatedAt: null,
    };
    const post = createPostFixture({
      cover: {
        id: "cover",
        key: "key",
        name: "photo",
        size: 2,
        type: "image/png",
        url: "https://assets.test/photo.png",
        color: null,
        height: 10,
        width: null,
        createdAt: null,
        updatedAt: null,
      },
      category: {
        id: "category",
        title: { zh: "分类" },
        description: null,
        parent: null,
        status: EnableStatus.ENABLE,
        path: "category",
        createdAt: null,
        updatedAt: null,
      },
      author: {
        id: "author",
        name: null,
      },
      movieActors: [tag],
      movieDirectors: [tag],
      movieStyles: [tag],
      galleryStyles: [tag],
    });
    const original = { list: [post], total: 1 };
    const restored = PostListResultSchema.parse(
      JSON.parse(JSON.stringify(original)),
    );
    const expected = { ...post };
    Reflect.deleteProperty(expected, "creationToken");
    Reflect.deleteProperty(expected, "creationInputHash");
    expect(restored).toEqual({ list: [expected], total: 1 });
    expect(restored.list[0]).not.toHaveProperty("creationToken");
    expect(restored.list[0]).not.toHaveProperty("creationInputHash");
  });
});
