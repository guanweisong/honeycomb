import { describe, expect, it, vi } from "vitest";
import { PostStatus } from "@/packages/domain/content/post-status";
import { publishPost, withdrawPost } from "./application/post-command-handlers";
import { InProcessEventBus } from "@/packages/domain/events/event-bus";

const input = { id: "post-1", status: PostStatus.DRAFT } as never;

describe("Post command handlers", () => {
  it("通过聚合发布文章", async () => {
    const update = vi.fn().mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });
    await publishPost({ update } as never, input);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: PostStatus.PUBLISHED }));
  });

  it("发布成功后派发领域事件", async () => {
    const update = vi.fn().mockResolvedValue({ id: "post-1", status: PostStatus.PUBLISHED });
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    bus.subscribe("post.published", handler);
    await publishPost({ update } as never, input, bus);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("通过聚合撤回文章", async () => {
    const update = vi.fn().mockResolvedValue({ id: "post-1", status: PostStatus.DRAFT });
    await withdrawPost({ update } as never, { id: "post-1", status: PostStatus.PUBLISHED } as never);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: PostStatus.DRAFT }));
  });
});
