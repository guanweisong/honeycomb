import { describe, expect, it, vi } from "vitest";
import { PostStatus } from "@/packages/domain/content/post-status";
import { publishPost, withdrawPost } from "./application/post-command-handlers";
import { updatePost } from "./application/post-commands";
import { InProcessEventBus } from "@/packages/domain/events/event-bus";

const input = { id: "post-1", status: PostStatus.DRAFT };

describe("Post command handlers", () => {
  it("通过聚合发布文章", async () => {
    const update = vi.fn().mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });
    await publishPost({ update }, input);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: PostStatus.PUBLISHED }));
  });

  it("发布成功后派发领域事件", async () => {
    const update = vi.fn().mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    bus.subscribe("post.published", handler);
    await publishPost({ update }, input, bus);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("通过聚合撤回文章", async () => {
    const update = vi.fn().mockResolvedValue({ id: "post-1", status: PostStatus.DRAFT });
    await withdrawPost({ update }, { id: "post-1", status: PostStatus.PUBLISHED });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: PostStatus.DRAFT }));
  });

  it("更新文章状态时必须先经过文章聚合", async () => {
    const findStatus = vi.fn().mockResolvedValue(PostStatus.DRAFT);
    const update = vi.fn().mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });

    await updatePost(
      { findStatus, update },
      { id: "post-1", title: { zh: "标题" }, status: PostStatus.PUBLISHED },
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
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });
});
