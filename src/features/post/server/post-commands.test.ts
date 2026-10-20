import { TagType } from "@/features/tag/tag-kind";
import * as schema from "@/lib/db/schema";
import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { PostStatus } from "@/features/post/post-status";
import {
  createPost,
  updatePost,
  destroyPosts,
  updatePostTags,
} from "./post-commands";

const input = { categoryId: "category" };
const id = "post-1";
const cache = (state: "completed" | "degraded" = "completed") => ({
  invalidate: vi.fn().mockResolvedValue({ state }),
});
const targets = (ids: string[]) => ({
  contents: ids.map((id) => ({ id, type: "post" })),
  refreshLayout: true,
  refreshPostIndex: true,
  refreshSitemap: true,
});

describe("post direct writes and public synchronization", () => {
  it("creates the record in a transaction before invalidating public data", async () => {
    const fake = createMockDb();
    const order: string[] = [];
    fake.returning.mockImplementation(async () => {
      order.push("write");
      return [{ id }];
    });
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("invalidate");
        return { state: "completed" as const };
      }),
    };
    await expect(
      createPost(asMockDatabase(fake), input, "author", invalidator),
    ).resolves.toEqual({ id, publicSync: "completed" });
    expect(order).toEqual(["write", "invalidate"]);
    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
      targets([id]),
    );
  });
  it("does not invalidate public data after a failed create", async () => {
    const fake = createMockDb();
    fake.returning.mockRejectedValue(new Error("database failed"));
    const invalidator = cache();
    await expect(
      createPost(asMockDatabase(fake), input, "author", invalidator),
    ).rejects.toThrow("database failed");
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("invalidates every deleted item only after deleting", async () => {
    const fake = createMockDb();
    const order: string[] = [];
    fake.where.mockImplementation(async () => {
      order.push("delete");
    });
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("invalidate");
        return { state: "completed" as const };
      }),
    };
    await expect(
      destroyPosts(asMockDatabase(fake), [id, "second"], invalidator),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(order).toEqual(["delete", "invalidate"]);
    expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
      targets([id, "second"]),
    );
  });
  it.each(["completed", "degraded"] as const)(
    "returns committed writes with %s public synchronization without retrying",
    async (state) => {
      const fake = createMockDb();
      fake.returning.mockResolvedValue([{ id }]);
      fake.limit.mockResolvedValue([{ id }]);
      const invalidator = cache(state);
      await expect(
        createPost(asMockDatabase(fake), input, "author", invalidator),
      ).resolves.toEqual({ id, publicSync: state });
      await expect(
        updatePost(asMockDatabase(fake), { id }, invalidator),
      ).resolves.toEqual({ id, publicSync: state });
      expect(fake.returning).toHaveBeenCalledOnce();
      expect(fake.transaction).toHaveBeenCalledTimes(2);
      expect(invalidator.invalidate).toHaveBeenCalledTimes(2);
      expect(invalidator.invalidate).toHaveBeenLastCalledWith(targets([id]));
    },
  );
  it("rejects missing persisted create and update results", async () => {
    const fake = createMockDb();
    fake.returning.mockResolvedValue([]);
    fake.limit.mockResolvedValue([]);
    const invalidator = cache();
    await expect(
      createPost(asMockDatabase(fake), input, "author", invalidator),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    await expect(
      updatePost(asMockDatabase(fake), { id }, invalidator),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});

describe("post update sequencing", () => {
  it.each([
    [PostStatus.DRAFT, PostStatus.PUBLISHED],
    [PostStatus.TO_AUDIT, PostStatus.PUBLISHED],
    [PostStatus.PUBLISHED, PostStatus.DRAFT],
  ])(
    "%s → %s reads current status, writes, then invalidates",
    async (current, target) => {
      const fake = createMockDb();
      const order: string[] = [];
      fake.limit.mockImplementation(async () => {
        order.push("read");
        return [{ status: current }];
      });
      fake.returning.mockImplementation(async () => {
        order.push("write");
        return [{ id }];
      });
      const invalidator = {
        invalidate: vi.fn(async () => {
          order.push("invalidate");
          return { state: "completed" as const };
        }),
      };
      await expect(
        updatePost(asMockDatabase(fake), { id, status: target }, invalidator),
      ).resolves.toEqual({ id, publicSync: "completed" });
      expect(order).toEqual(["read", "write", "invalidate"]);
      expect(fake.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: target }),
      );
      expect(fake.transaction).toHaveBeenCalledOnce();
    },
  );
  it("does not read current status when status is omitted", async () => {
    const fake = createMockDb();
    fake.returning.mockResolvedValue([{ id }]);
    fake.where.mockReturnValueOnce(fake).mockResolvedValueOnce([]);
    await updatePost(
      asMockDatabase(fake),
      { id, title: { zh: "标题", en: "Title" } },
      cache(),
    );
    expect(fake.limit).not.toHaveBeenCalled();
  });
  it.each([PostStatus.PUBLISHED, PostStatus.DRAFT, PostStatus.TO_AUDIT])(
    "keeps an unchanged %s status",
    async (status) => {
      const fake = createMockDb();
      fake.limit.mockResolvedValue([{ status }]);
      fake.returning.mockResolvedValue([{ id }]);
      await expect(
        updatePost(asMockDatabase(fake), { id, status }, cache()),
      ).resolves.toMatchObject({ id });
      expect(fake.set).toHaveBeenCalledWith(
        expect.objectContaining({ status }),
      );
    },
  );
  it.each([
    {
      current: null,
      target: PostStatus.PUBLISHED,
      code: "POST_NOT_FOUND",
      message: "文章不存在",
    },
    {
      current: "UNKNOWN",
      target: PostStatus.PUBLISHED,
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      current: "UNKNOWN",
      target: PostStatus.DRAFT,
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      current: PostStatus.TO_AUDIT,
      target: PostStatus.DRAFT,
      code: "INVALID_STATE_TRANSITION",
      message: "只有已发布文章可以撤回",
    },
    {
      current: PostStatus.PUBLISHED,
      target: PostStatus.TO_AUDIT,
      code: "INVALID_POST_STATUS",
      message: `文章不支持变更为 ${PostStatus.TO_AUDIT}`,
    },
  ])(
    "rejects $current → $target before writes or invalidation",
    async ({ current, target, ...error }) => {
      const fake = createMockDb();
      fake.limit.mockResolvedValue(
        current === null ? [] : [{ status: current }],
      );
      const invalidator = cache();
      await expect(
        updatePost(asMockDatabase(fake), { id, status: target }, invalidator),
      ).rejects.toMatchObject(error);
      expect(fake.transaction).not.toHaveBeenCalled();
      expect(invalidator.invalidate).not.toHaveBeenCalled();
    },
  );
  it("does not invalidate when the status write fails", async () => {
    const fake = createMockDb();
    fake.limit.mockResolvedValue([{ status: PostStatus.DRAFT }]);
    const failure = new Error("write failed");
    fake.returning.mockRejectedValue(failure);
    const invalidator = cache();
    await expect(
      updatePost(
        asMockDatabase(fake),
        { id, status: PostStatus.PUBLISHED },
        invalidator,
      ),
    ).rejects.toBe(failure);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});

describe("post tag writes", () => {
  it("deduplicates tags inside one transaction before invalidating the post", async () => {
    const fake = createMockDb();
    const order: string[] = [];
    fake.values.mockImplementation(async () => {
      order.push("tags");
    });
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("invalidate");
        return { state: "degraded" as const };
      }),
    };
    await expect(
      updatePostTags(
        asMockDatabase(fake),
        {
          postId: id,
          tagIds: ["tag-1", "tag-1", "tag-2"],
          type: TagType.ACTOR,
        },
        invalidator,
      ),
    ).resolves.toEqual({ success: true, publicSync: "degraded" });
    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(fake.delete).toHaveBeenCalledWith(schema.postTag);
    expect(fake.values).toHaveBeenCalledExactlyOnceWith([
      { postId: id, tagId: "tag-1", type: TagType.ACTOR },
      { postId: id, tagId: "tag-2", type: TagType.ACTOR },
    ]);
    expect(order).toEqual(["tags", "invalidate"]);
    expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
      targets([id]),
    );
  });
  it("clears the selected tag type without an empty insert", async () => {
    const fake = createMockDb();
    const invalidator = cache();
    await expect(
      updatePostTags(
        asMockDatabase(fake),
        { postId: id, tagIds: [], type: TagType.ACTOR },
        invalidator,
      ),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(fake.delete).toHaveBeenCalledWith(schema.postTag);
    expect(fake.insert).not.toHaveBeenCalled();
    expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
      targets([id]),
    );
  });
  it("does not invalidate after a failed tag transaction", async () => {
    const fake = createMockDb();
    const failure = new Error("tag insert failed");
    fake.values.mockRejectedValue(failure);
    const invalidator = cache();
    await expect(
      updatePostTags(
        asMockDatabase(fake),
        { postId: id, tagIds: ["tag-1"], type: TagType.ACTOR },
        invalidator,
      ),
    ).rejects.toBe(failure);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
