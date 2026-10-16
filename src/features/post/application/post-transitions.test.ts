import { describe, expect, it, vi } from "vitest";
import { PostStatus } from "@/packages/domain/content/post-status";
import { publishPost, withdrawPost, updatePost } from "./post-commands";

const input = { id: "post-1", status: PostStatus.DRAFT };
const invalidator = {
  invalidate: vi.fn().mockResolvedValue({ state: "completed" }),
};

describe("Post state transitions", () => {
  it("通过聚合发布文章", async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });
    await publishPost({ update }, input);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: PostStatus.PUBLISHED }),
    );
  });

  it("发布成功后返回持久化结果", async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });
    await expect(publishPost({ update }, input)).resolves.toEqual({
      id: "post-1",
      status: PostStatus.PUBLISHED,
    });
  });

  it("通过聚合撤回文章", async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: "post-1", status: PostStatus.DRAFT });
    await withdrawPost(
      { update },
      { id: "post-1", status: PostStatus.PUBLISHED },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: PostStatus.DRAFT }),
    );
  });

  it("更新文章状态时必须先经过文章聚合", async () => {
    const findStatus = vi.fn().mockResolvedValue(PostStatus.DRAFT);
    const update = vi
      .fn()
      .mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });

    await updatePost(
      { findStatus, update },
      { id: "post-1", title: { zh: "标题" }, status: PostStatus.PUBLISHED },
      invalidator,
    );

    expect(findStatus).toHaveBeenCalledWith("post-1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1", status: PostStatus.PUBLISHED }),
    );
  });

  it("拒绝文章聚合不支持的状态流转", async () => {
    const findStatus = vi.fn().mockResolvedValue(PostStatus.PUBLISHED);
    const update = vi.fn();

    await expect(
      updatePost(
        { findStatus, update },
        { id: "post-1", status: PostStatus.TO_AUDIT },
        invalidator,
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });
});

const cache = () => ({
  invalidate: vi.fn().mockResolvedValue({ state: "completed" }),
});

describe("Post update sequencing", () => {
  it.each([
    [PostStatus.DRAFT, PostStatus.PUBLISHED],
    [PostStatus.TO_AUDIT, PostStatus.PUBLISHED],
    [PostStatus.PUBLISHED, PostStatus.DRAFT],
  ])("%s → %s 先读取状态、写入，再失效缓存", async (current, target) => {
    const order: string[] = [];
    const changes = { id: "post-1", title: { zh: "标题" }, status: target };
    const repository = {
      findStatus: vi.fn(async () => {
        order.push("read");
        return current;
      }),
      update: vi.fn(async () => {
        order.push("write");
        return { id: "post-1" };
      }),
    };
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("invalidate");
        return { state: "completed" as const };
      }),
    };

    await expect(updatePost(repository, changes, invalidator)).resolves.toEqual(
      {
        id: "post-1",
        publicSync: "completed",
      },
    );
    expect(order).toEqual(["read", "write", "invalidate"]);
    expect(repository.update).toHaveBeenCalledExactlyOnceWith(changes);
  });

  it("不改变状态时不读取当前状态", async () => {
    const repository = {
      findStatus: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "post-1" }),
    };
    const changes = { id: "post-1", title: { zh: "仅修改标题" } };

    await updatePost(repository, changes, cache());

    expect(repository.findStatus).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledExactlyOnceWith(changes);
  });

  it.each([PostStatus.PUBLISHED, PostStatus.DRAFT, PostStatus.TO_AUDIT])(
    "当前状态已经为 %s 时直接保留本次更新",
    async (status) => {
      const repository = {
        findStatus: vi.fn().mockResolvedValue(status),
        update: vi.fn().mockResolvedValue({ id: "post-1" }),
      };
      const changes = { id: "post-1", status };

      await expect(updatePost(repository, changes, cache())).resolves.toEqual({
        id: "post-1",
        publicSync: "completed",
      });
      expect(repository.update).toHaveBeenCalledExactlyOnceWith(changes);
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
      code: "INVALID_POST_STATUS",
      message: "文章当前状态不合法",
    },
    {
      current: "UNKNOWN",
      target: PostStatus.DRAFT,
      code: "INVALID_POST_STATUS",
      message: "文章当前状态不合法",
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
    "拒绝 $current → $target 后不写入或失效缓存",
    async ({ current, target, code, message }) => {
      const repository = {
        findStatus: vi.fn().mockResolvedValue(current),
        update: vi.fn(),
      };
      const invalidator = cache();

      await expect(
        updatePost(repository, { id: "post-1", status: target }, invalidator),
      ).rejects.toMatchObject({ code, message });
      expect(repository.update).not.toHaveBeenCalled();
      expect(invalidator.invalidate).not.toHaveBeenCalled();
    },
  );

  it("状态更新写入失败时原样抛错且不失效缓存", async () => {
    const failure = new Error("write failed");
    const repository = {
      findStatus: vi.fn().mockResolvedValue(PostStatus.DRAFT),
      update: vi.fn().mockRejectedValue(failure),
    };
    const invalidator = cache();

    await expect(
      updatePost(
        repository,
        { id: "post-1", status: PostStatus.PUBLISHED },
        invalidator,
      ),
    ).rejects.toBe(failure);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
