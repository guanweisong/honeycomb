import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { moderateComment } from "./application/comment-command-handlers";
import { updateComment } from "./application/comment-commands";

describe("Comment command handlers", () => {
  it("审核成功后派发事件", async () => {
    const update = vi.fn().mockResolvedValue({ id: "comment-1", status: CommentStatus.PUBLISH });
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    bus.subscribe("comment.moderated", handler);
    await moderateComment({ update }, { id: "comment-1", currentStatus: CommentStatus.TO_AUDIT, status: CommentStatus.PUBLISH }, bus);
    expect(update).toHaveBeenCalledWith({ id: "comment-1", status: CommentStatus.PUBLISH });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("更新评论状态时必须先经过评论聚合", async () => {
    const findStatus = vi.fn().mockResolvedValue(CommentStatus.TO_AUDIT);
    const update = vi.fn().mockResolvedValue({ id: "comment-1", status: CommentStatus.PUBLISH });

    await updateComment(
      { findStatus, update },
      { id: "comment-1", status: CommentStatus.PUBLISH },
    );

    expect(findStatus).toHaveBeenCalledWith("comment-1");
    expect(update).toHaveBeenCalledWith({ id: "comment-1", status: CommentStatus.PUBLISH });
  });

  it("拒绝评论聚合不支持的状态流转", async () => {
    const findStatus = vi.fn().mockResolvedValue(CommentStatus.PUBLISH);
    const update = vi.fn();

    await expect(
      updateComment(
        { findStatus, update },
        { id: "comment-1", status: CommentStatus.TO_AUDIT },
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });
});
