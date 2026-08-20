import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { moderateComment } from "./comment-command-handlers";

describe("Comment command handlers", () => {
  it("审核成功后派发事件", async () => {
    const update = vi.fn().mockResolvedValue({ id: "comment-1", status: CommentStatus.PUBLISH });
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    bus.subscribe("comment.moderated", handler);
    await moderateComment({ update } as never, { id: "comment-1", currentStatus: CommentStatus.TO_AUDIT, status: CommentStatus.PUBLISH }, bus);
    expect(update).toHaveBeenCalledWith({ id: "comment-1", status: CommentStatus.PUBLISH });
    expect(handler).toHaveBeenCalledOnce();
  });
});
