import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import { moderateComment } from "./application/comment-command-handlers";
import { createComment, updateComment } from "./application/comment-commands";

describe("Comment command handlers", () => {
  const createdComment = {
    id: "comment-1",
    author: "Visitor",
    content: "Hello",
    site: null,
    email: "visitor@example.test",
    parentId: null,
    postId: "post-1",
    pageId: null,
    customId: null,
    status: CommentStatus.PUBLISH,
    createdAt: null,
    updatedAt: null,
    userAgent: "sensitive agent",
    ip: "203.0.113.10",
  };

  it("通知失败时仍返回已创建的脱敏评论", async () => {
    const notify = vi.fn().mockRejectedValue(new Error("notification failed"));
    const logNotificationFailure = vi.fn();

    const result = await createComment(
      { create: vi.fn().mockResolvedValue(createdComment) },
      new Headers(),
      {
        author: createdComment.author,
        content: createdComment.content,
        email: createdComment.email,
        postId: createdComment.postId,
      },
      vi.fn().mockResolvedValue(undefined),
      notify,
      logNotificationFailure,
    );

    expect(result).toMatchObject({ id: createdComment.id, author: "Visitor" });
    expect(result).not.toHaveProperty("email");
    expect(logNotificationFailure).toHaveBeenCalledWith(
      expect.any(Error),
    );
  });

  it("数据库创建失败时不调用通知", async () => {
    const notify = vi.fn();

    await expect(
      createComment(
        { create: vi.fn().mockRejectedValue(new Error("database failed")) },
        new Headers(),
        {
          author: createdComment.author,
          content: createdComment.content,
          email: createdComment.email,
          postId: createdComment.postId,
        },
        vi.fn().mockResolvedValue(undefined),
        notify,
      ),
    ).rejects.toThrow("database failed");

    expect(notify).not.toHaveBeenCalled();
  });

  it("审核成功后返回持久化结果", async () => {
    const update = vi.fn().mockResolvedValue({ id: "comment-1", status: CommentStatus.PUBLISH });
    await expect(moderateComment({ update }, { id: "comment-1", currentStatus: CommentStatus.TO_AUDIT, status: CommentStatus.PUBLISH })).resolves.toEqual({ id: "comment-1", status: CommentStatus.PUBLISH });
    expect(update).toHaveBeenCalledWith({ id: "comment-1", status: CommentStatus.PUBLISH });
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
