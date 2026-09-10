import { describe, expect, it, vi } from "vitest";
import { TagType } from "@/packages/domain/content/tag";
import {
  createPost,
  destroyPosts,
  updatePost,
  updatePostTags,
} from "./post-commands";

const postId = "507f1f77bcf86cd799439011";
const secondPostId = "507f1f77bcf86cd799439012";
const input = { categoryId: "507f1f77bcf86cd799439013" };

describe("Post cache side effects", () => {
  it("创建成功后按顺序失效新文章缓存", async () => {
    const order: string[] = [];
    const repository = {
      create: vi.fn(async () => {
        order.push("repository");
        return { id: postId };
      }),
    };
    const invalidator = {
      invalidateContent: vi.fn(async () => {
        order.push("cache");
      }),
    };

    await expect(
      createPost(repository, input, "author-1", invalidator),
    ).resolves.toEqual({ id: postId });
    expect(order).toEqual(["repository", "cache"]);
    expect(invalidator.invalidateContent).toHaveBeenCalledWith({
      id: postId,
      type: "post",
    });
  });

  it("数据库写入失败时不失效缓存", async () => {
    const invalidator = { invalidateContent: vi.fn() };

    await expect(
      createPost(
        { create: vi.fn().mockRejectedValue(new Error("database failed")) },
        input,
        "author-1",
        invalidator,
      ),
    ).rejects.toThrow("database failed");
    expect(invalidator.invalidateContent).not.toHaveBeenCalled();
  });

  it("批量删除成功后失效每个文章目标", async () => {
    const invalidator = {
      invalidateContent: vi.fn().mockResolvedValue(undefined),
    };

    await destroyPosts(
      { destroy: vi.fn().mockResolvedValue({ success: true }) },
      [postId, secondPostId],
      invalidator,
    );

    expect(invalidator.invalidateContent.mock.calls).toEqual([
      [{ id: postId, type: "post" }],
      [{ id: secondPostId, type: "post" }],
    ]);
  });

  it("更新成功后失效文章缓存", async () => {
    const invalidator = {
      invalidateContent: vi.fn().mockResolvedValue(undefined),
    };

    await updatePost(
      {
        findStatus: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: postId }),
      },
      { id: postId },
      invalidator,
    );

    expect(invalidator.invalidateContent).toHaveBeenCalledWith({
      id: postId,
      type: "post",
    });
  });

  it("标签更新成功后失效所属文章缓存", async () => {
    const invalidator = {
      invalidateContent: vi.fn().mockResolvedValue(undefined),
    };

    await updatePostTags(
      { updateTags: vi.fn().mockResolvedValue({ success: true }) },
      { postId, tagIds: [], type: TagType.ACTOR },
      invalidator,
    );

    expect(invalidator.invalidateContent).toHaveBeenCalledWith({
      id: postId,
      type: "post",
    });
  });

  it("缓存失败在数据库成功后继续传播", async () => {
    const cacheError = new Error("cache failed");

    await expect(
      createPost(
        { create: vi.fn().mockResolvedValue({ id: postId }) },
        input,
        "author-1",
        { invalidateContent: vi.fn().mockRejectedValue(cacheError) },
      ),
    ).rejects.toBe(cacheError);
  });
});
